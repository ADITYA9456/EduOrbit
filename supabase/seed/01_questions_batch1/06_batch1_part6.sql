-- Count Primes (Easy)
INSERT INTO coding_problems (slug, title, description, difficulty, category, type, tags, starter_code, test_cases, examples, constraints, points, order_index, time_limit_ms, memory_limit_kb, input_format, output_format, editorial, judged)
VALUES ($q$count-primes$q$, $q$Count Primes$q$, $q$Given an integer n, count the prime numbers p with p ≤ n.$q$, $q$Easy$q$, $q$Math$q$, 'code', ARRAY[$q$math$q$, $q$sieve$q$]::text[], $q${"python": "import sys\n\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # Input:\n    # One integer n.\n    # TODO: solve, then print the answer\n\n\nmain()\n", "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n// Input:\n// One integer n.\n// TODO: solve, then console.log the answer\n", "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String s; (s = in.readLine()) != null; ) lines.add(s);\n        // Input:\n        // One integer n.\n        // TODO: solve, then System.out.println the answer\n    }\n}\n", "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Input:\n    // One integer n.\n    // TODO: read with cin / getline, solve, print the answer\n    return 0;\n}\n", "c": "#include <stdio.h>\n\nint main(void) {\n    // Input:\n    // One integer n.\n    /* TODO: read with scanf / fgets, solve, print the answer */\n    return 0;\n}\n"}$q$::jsonb, '[]'::jsonb, $q$[{"input": "10", "output": "4", "explanation": "The primes are 2, 3, 5 and 7."}, {"input": "2", "output": "1", "explanation": ""}]$q$::jsonb, ARRAY[$q$0 ≤ n ≤ 1 000 000$q$]::text[], 10, 1006, 2000, 262144, $q$One integer n.$q$, $q$One integer, the number of primes up to and including n.$q$, $q$Use the sieve of Eratosthenes: mark multiples of every prime starting from p·p. That is O(n log log n), fast enough for n = 10^6. Testing each number by trial division works for small n but gets slow near the limit.$q$, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problem_tests (problem_id, position, is_sample, input, expected_output)
SELECT p.id, v.position, v.is_sample, v.input, v.expected_output
FROM coding_problems p
CROSS JOIN (VALUES
  (1, true, $q$10
$q$, $q$4
$q$),
  (2, true, $q$2
$q$, $q$1
$q$),
  (3, false, $q$0
$q$, $q$0
$q$),
  (4, false, $q$1
$q$, $q$0
$q$),
  (5, false, $q$3
$q$, $q$2
$q$),
  (6, false, $q$4
$q$, $q$2
$q$),
  (7, false, $q$97
$q$, $q$25
$q$),
  (8, false, $q$100
$q$, $q$25
$q$),
  (9, false, $q$1000
$q$, $q$168
$q$),
  (10, false, $q$99991
$q$, $q$9592
$q$),
  (11, false, $q$1000000
$q$, $q$78498
$q$),
  (12, false, $q$999983
$q$, $q$78498
$q$)
) AS v(position, is_sample, input, expected_output)
WHERE p.slug = $q$count-primes$q$
ON CONFLICT (problem_id, position) DO NOTHING;

UPDATE coding_problems SET judged = true WHERE slug = $q$count-primes$q$ AND EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = coding_problems.id);

