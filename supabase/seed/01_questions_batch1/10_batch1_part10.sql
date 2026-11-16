-- Fewest Coins (Medium)
INSERT INTO coding_problems (slug, title, description, difficulty, category, type, tags, starter_code, test_cases, examples, constraints, points, order_index, time_limit_ms, memory_limit_kb, input_format, output_format, editorial, judged)
VALUES ($q$fewest-coins$q$, $q$Fewest Coins$q$, $q$You have coins of several distinct denominations and an unlimited supply of each. Find the smallest number of coins that add up to exactly the given amount.

If the amount cannot be made, print -1. The amount 0 needs 0 coins.$q$, $q$Medium$q$, $q$Dynamic Programming$q$, 'code', ARRAY[$q$dynamic-programming$q$, $q$unbounded-knapsack$q$]::text[], $q${"python": "import sys\n\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # Input:\n    # Line 1: n (number of denominations) and the amount.\n    # Line 2: the n denominations.\n    # TODO: solve, then print the answer\n\n\nmain()\n", "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n// Input:\n// Line 1: n (number of denominations) and the amount.\n// Line 2: the n denominations.\n// TODO: solve, then console.log the answer\n", "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String s; (s = in.readLine()) != null; ) lines.add(s);\n        // Input:\n        // Line 1: n (number of denominations) and the amount.\n        // Line 2: the n denominations.\n        // TODO: solve, then System.out.println the answer\n    }\n}\n", "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Input:\n    // Line 1: n (number of denominations) and the amount.\n    // Line 2: the n denominations.\n    // TODO: read with cin / getline, solve, print the answer\n    return 0;\n}\n", "c": "#include <stdio.h>\n\nint main(void) {\n    // Input:\n    // Line 1: n (number of denominations) and the amount.\n    // Line 2: the n denominations.\n    /* TODO: read with scanf / fgets, solve, print the answer */\n    return 0;\n}\n"}$q$::jsonb, '[]'::jsonb, $q$[{"input": "3 11\n1 2 5", "output": "3", "explanation": "5 + 5 + 1."}, {"input": "1 3\n2", "output": "-1", "explanation": "Only even totals are possible."}]$q$::jsonb, ARRAY[$q$1 ≤ n ≤ 100$q$, $q$1 ≤ denomination ≤ 10 000$q$, $q$0 ≤ amount ≤ 10 000$q$]::text[], 25, 1010, 2000, 262144, $q$Line 1: n (number of denominations) and the amount.
Line 2: the n denominations.$q$, $q$One integer: the minimum number of coins, or -1.$q$, $q$Greedy (always take the biggest coin) fails, for example with coins 1, 3, 4 and amount 6. Use dynamic programming: dp[x] is the fewest coins for amount x, with dp[0] = 0 and dp[x] = 1 + min(dp[x - c]) over coins c ≤ x. The answer is dp[amount], or -1 if it is still infinite. O(n · amount).$q$, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problem_tests (problem_id, position, is_sample, input, expected_output)
SELECT p.id, v.position, v.is_sample, v.input, v.expected_output
FROM coding_problems p
CROSS JOIN (VALUES
  (1, true, $q$3 11
1 2 5
$q$, $q$3
$q$),
  (2, true, $q$1 3
2
$q$, $q$-1
$q$),
  (3, false, $q$1 0
5
$q$, $q$0
$q$),
  (4, false, $q$4 6249
186 419 83 408
$q$, $q$20
$q$),
  (5, false, $q$2 7
2 4
$q$, $q$-1
$q$),
  (6, false, $q$3 9999
7 13 29
$q$, $q$347
$q$),
  (7, false, $q$1 10000
1
$q$, $q$10000
$q$),
  (8, false, $q$3 100
1 5 10
$q$, $q$10
$q$),
  (9, false, $q$2 8
6 4
$q$, $q$2
$q$),
  (10, false, $q$7 9024
9 107 221 238 249 297 418
$q$, $q$25
$q$),
  (11, false, $q$20 7148
19 24 40 73 84 129 147 169 183 186 197 217 252 268 310 336 383 417 442 489
$q$, $q$16
$q$),
  (12, false, $q$31 5532
4 24 70 91 101 122 124 157 162 187 189 194 225 227 232 235 242 276 283 300 316 340 343 353 395 397 442 461 467 483 498
$q$, $q$12
$q$)
) AS v(position, is_sample, input, expected_output)
WHERE p.slug = $q$fewest-coins$q$
ON CONFLICT (problem_id, position) DO NOTHING;

UPDATE coding_problems SET judged = true WHERE slug = $q$fewest-coins$q$ AND EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = coding_problems.id);

NOTIFY pgrst, 'reload schema';
