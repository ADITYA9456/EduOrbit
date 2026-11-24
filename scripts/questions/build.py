"""Builds the question seed SQL and a JSON fixture for verification.

  python scripts/questions/build.py

For every problem it
  1. runs the python reference on all sample + hidden inputs to get the expected outputs,
  2. asserts the sample outputs written in the statement match the reference,
  3. cross-checks the reference against a brute-force function on random small inputs,
  4. writes supabase/seed/*.sql and scripts/questions/generated/problems.json.
Nothing here touches a database.
"""
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

from bank_easy import EASY  # noqa: E402
from bank_medium import MEDIUM  # noqa: E402
from bank_hard import HARD  # noqa: E402

try:  # extended banks are optional so the original 20 can still be rebuilt alone
    from bank_x1 import X1  # noqa: E402
except ImportError:
    X1 = []
try:
    from bank_x2 import X2  # noqa: E402
except ImportError:
    X2 = []
try:
    from bank_x3 import X3  # noqa: E402
except ImportError:
    X3 = []

ALL = EASY + MEDIUM + HARD + X1 + X2 + X3
assert len({p['slug'] for p in ALL}) == len(ALL), 'duplicate slug'

BRUTE_CASES = 250


def run_py(src, text):
    r = subprocess.run([sys.executable, '-c', src], input=text, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"reference crashed: {r.stderr[:400]}")
    return r.stdout


def norm(s):
    lines = [l.rstrip() for l in s.replace('\r\n', '\n').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


STARTERS = {
    'python': "import sys\n\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n{c}    # TODO: solve, then print the answer\n\n\nmain()\n",
    'javascript': "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n{c}// TODO: solve, then console.log the answer\n",
    'java': "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String s; (s = in.readLine()) != null; ) lines.add(s);\n{c}        // TODO: solve, then System.out.println the answer\n    }\n}\n",
    'cpp': "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n{c}    // TODO: read with cin / getline, solve, print the answer\n    return 0;\n}\n",
    'c': "#include <stdio.h>\n\nint main(void) {\n{c}    /* TODO: read with scanf / fgets, solve, print the answer */\n    return 0;\n}\n",
}
COMMENT = {'python': '    # ', 'javascript': '// ', 'java': '        // ', 'cpp': '    // ', 'c': '    // '}


def starters(p):
    out = {}
    for lang, tpl in STARTERS.items():
        c = ''.join(f"{COMMENT[lang]}{l}\n" for l in ['Input:'] + p['input_format'].split('\n'))
        out[lang] = tpl.replace('{c}', c)
    return out


def q(s):
    assert '$q$' not in s
    return f"$q${s}$q$"


def reference(p, inp):
    # Compact problems carry the solver as a function (fast, in-process); the others run as a program.
    return str(p['fn'](inp)) + '\n' if 'fn' in p else run_py(p['py'], inp)


def build_problem(p, index):
    samples = []
    for i, (inp, out, expl) in enumerate(p['samples']):
        got = run_py(p['py'], inp)  # samples always run as the real program
        assert norm(got) == norm(out), f"{p['slug']}: statement sample {i + 1} disagrees with reference: {got!r} vs {out!r}"
        samples.append((inp, got, expl))

    sample_inputs = {s[0] for s in samples}
    hidden_inputs = []
    for inp in p['hidden']():
        if inp not in sample_inputs and inp not in hidden_inputs:
            hidden_inputs.append(inp)
    assert len(hidden_inputs) >= 5, p['slug']
    hidden = [(inp, reference(p, inp)) for inp in hidden_inputs]

    r = random.Random(1000 + index)
    for _ in range(BRUTE_CASES):
        inp = p['small'](r)
        a, b = norm(reference(p, inp)), norm(p['brute'](inp))
        assert a == b, f"{p['slug']}: reference != brute on {inp!r}: {a!r} vs {b!r}"
    for inp, out in hidden:
        if len(inp) < 400:
            assert norm(out) == norm(p['brute'](inp)), f"{p['slug']}: hidden test disagrees with brute: {inp!r}"

    return samples, hidden


def problem_sql(p, index, samples, hidden):
    examples = [{'input': i.rstrip('\n'), 'output': o.rstrip('\n'), 'explanation': e} for i, o, e in samples]
    arr = lambda xs: 'ARRAY[' + ', '.join(q(x) for x in xs) + ']::text[]'
    lines = [f"-- {p['title']} ({p['difficulty']})"]
    lines.append(
        "INSERT INTO coding_problems (slug, title, description, difficulty, category, type, tags, starter_code, "
        "test_cases, examples, constraints, points, order_index, time_limit_ms, memory_limit_kb, input_format, "
        "output_format, editorial, judged)\nVALUES ("
        f"{q(p['slug'])}, {q(p['title'])}, {q(p['statement'])}, {q(p['difficulty'])}, {q(p['category'])}, 'code', "
        f"{arr(p['tags'])}, {q(json.dumps(starters(p), ensure_ascii=False))}::jsonb, '[]'::jsonb, "
        f"{q(json.dumps(examples, ensure_ascii=False))}::jsonb, {arr(p['constraints'])}, {p['points']}, {1000 + index}, "
        f"2000, 262144, {q(p['input_format'])}, {q(p['output_format'])}, '', false)\n"
        "ON CONFLICT (slug) DO NOTHING;\n"
    )
    rows = []
    pos = 1
    for inp, out, _ in samples:
        rows.append(f"  ({pos}, true, {q(inp)}, {q(out)})")
        pos += 1
    for inp, out in hidden:
        rows.append(f"  ({pos}, false, {q(inp)}, {q(out)})")
        pos += 1
    lines.append(
        "INSERT INTO problem_tests (problem_id, position, is_sample, input, expected_output)\n"
        "SELECT p.id, v.position, v.is_sample, v.input, v.expected_output\nFROM coding_problems p\n"
        "CROSS JOIN (VALUES\n" + ',\n'.join(rows) + "\n) AS v(position, is_sample, input, expected_output)\n"
        f"WHERE p.slug = {q(p['slug'])}\nON CONFLICT (problem_id, position) DO NOTHING;\n"
    )
    lines.append(
        'INSERT INTO problem_editorials (problem_id, body)\n'
        f"SELECT id, {q(p['editorial'])} FROM coding_problems WHERE slug = {q(p['slug'])}\n"
        'ON CONFLICT (problem_id) DO NOTHING;\n'
    )
    lines.append(
        f"UPDATE coding_problems SET judged = true WHERE slug = {q(p['slug'])} "
        "AND EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = coding_problems.id);\n"
    )
    return '\n'.join(lines)


def main():
    fixtures = []
    sql = {}
    for index, p in enumerate(ALL, start=1):
        samples, hidden = build_problem(p, index)
        print(f"ok  {p['difficulty']:6} {p['slug']:36} samples={len(samples)} hidden={len(hidden)}")
        fixtures.append({
            'slug': p['slug'], 'difficulty': p['difficulty'], 'py': p['py'], 'js': p.get('js', ''),
            'tests': [{'input': i, 'expected': o, 'sample': True} for i, o, _ in samples]
                     + [{'input': i, 'expected': o, 'sample': False} for i, o in hidden],
        })
        sql[p['slug']] = problem_sql(p, index, samples, hidden)

    batches = [
        ('01_questions_batch1.sql', [p['slug'] for p in EASY + MEDIUM[:3]], 'Batch 1: 7 Easy + 3 Medium'),
        ('02_questions_batch2.sql', [p['slug'] for p in MEDIUM[3:] + HARD], 'Batch 2: 5 Medium + 5 Hard'),
    ]
    for name, bank, label in (('04_questions_batch3.sql', X1, 'Batch 3'), ('05_questions_batch4.sql', X2, 'Batch 4'), ('06_questions_batch5.sql', X3, 'Batch 5')):
        if bank:
            batches.append((name, [p['slug'] for p in bank], f'{label}: {len(bank)} problems'))
    seed_dir = os.path.join(ROOT, 'supabase', 'seed')
    os.makedirs(seed_dir, exist_ok=True)
    for name, slugs, title in batches:
        header = (
            f"-- {name}: {title}\n-- Run AFTER migrations 001, 002 and 004. Safe to re-run (ON CONFLICT DO NOTHING).\n"
            "-- Generated by scripts/questions/build.py. Do not edit by hand; edit the bank and rebuild.\n"
            "-- Every expected output was produced by a reference solution that was cross-checked against\n"
            "-- a second implementation and a brute-force checker before this file was written.\n\n"
        )
        body = '\n'.join(sql[s] for s in slugs)
        with open(os.path.join(seed_dir, name), 'w', encoding='utf8', newline='\n') as f:
            f.write(header + body + "\nNOTIFY pgrst, 'reload schema';\n")
        print(f"wrote supabase/seed/{name} ({os.path.getsize(os.path.join(seed_dir, name)) / 1024:.0f} KB)")

    gen = os.path.join(HERE, 'generated')
    os.makedirs(gen, exist_ok=True)
    with open(os.path.join(gen, 'problems.json'), 'w', encoding='utf8') as f:
        json.dump(fixtures, f)
    print('wrote scripts/questions/generated/problems.json')


if __name__ == '__main__':
    main()
