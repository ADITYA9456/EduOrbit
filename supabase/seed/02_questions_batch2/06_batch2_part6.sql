-- Edit Distance (Hard)
INSERT INTO coding_problems (slug, title, description, difficulty, category, type, tags, starter_code, test_cases, examples, constraints, points, order_index, time_limit_ms, memory_limit_kb, input_format, output_format, editorial, judged)
VALUES ($q$edit-distance$q$, $q$Edit Distance$q$, $q$The edit distance between two strings is the smallest number of single-character operations needed to turn the first into the second. The operations are: insert a character, delete a character, replace a character with another.

Compute the edit distance between strings s and t. Either string can be empty.$q$, $q$Hard$q$, $q$Dynamic Programming$q$, 'code', ARRAY[$q$dynamic-programming$q$, $q$string$q$]::text[], $q${"python": "import sys\n\n\ndef main():\n    lines = sys.stdin.read().split('\\n')\n    # Input:\n    # Line 1: string s.\n    # Line 2: string t.\n    # Both lines may be empty.\n    # TODO: solve, then print the answer\n\n\nmain()\n", "javascript": "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n// Input:\n// Line 1: string s.\n// Line 2: string t.\n// Both lines may be empty.\n// TODO: solve, then console.log the answer\n", "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        List<String> lines = new ArrayList<>();\n        for (String s; (s = in.readLine()) != null; ) lines.add(s);\n        // Input:\n        // Line 1: string s.\n        // Line 2: string t.\n        // Both lines may be empty.\n        // TODO: solve, then System.out.println the answer\n    }\n}\n", "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Input:\n    // Line 1: string s.\n    // Line 2: string t.\n    // Both lines may be empty.\n    // TODO: read with cin / getline, solve, print the answer\n    return 0;\n}\n", "c": "#include <stdio.h>\n\nint main(void) {\n    // Input:\n    // Line 1: string s.\n    // Line 2: string t.\n    // Both lines may be empty.\n    /* TODO: read with scanf / fgets, solve, print the answer */\n    return 0;\n}\n"}$q$::jsonb, '[]'::jsonb, $q$[{"input": "horse\nros", "output": "3", "explanation": "horse → rorse (replace h) → rose (delete r) → ros (delete e)."}, {"input": "kitten\nsitting", "output": "3", "explanation": "Replace k, replace e, insert g."}]$q$::jsonb, ARRAY[$q$0 ≤ |s|, |t| ≤ 1 000$q$, $q$Lowercase English letters$q$]::text[], 50, 1016, 2000, 262144, $q$Line 1: string s.
Line 2: string t.
Both lines may be empty.$q$, $q$One integer, the edit distance.$q$, $q$Let d[i][j] be the distance between the first i characters of s and the first j of t. d[i][0] = i and d[0][j] = j. If s[i-1] = t[j-1] then d[i][j] = d[i-1][j-1]; otherwise d[i][j] = 1 + min(d[i-1][j], d[i][j-1], d[i-1][j-1]) for delete, insert and replace. Only the previous row is needed, so memory is O(|t|). Time O(|s|·|t|).$q$, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO problem_tests (problem_id, position, is_sample, input, expected_output)
SELECT p.id, v.position, v.is_sample, v.input, v.expected_output
FROM coding_problems p
CROSS JOIN (VALUES
  (1, true, $q$horse
ros
$q$, $q$3
$q$),
  (2, true, $q$kitten
sitting
$q$, $q$3
$q$),
  (3, false, $q$

$q$, $q$0
$q$),
  (4, false, $q$
abc
$q$, $q$3
$q$),
  (5, false, $q$abc

$q$, $q$3
$q$),
  (6, false, $q$intention
execution
$q$, $q$5
$q$),
  (7, false, $q$same
same
$q$, $q$0
$q$),
  (8, false, $q$abc
xyz
$q$, $q$3
$q$),
  (9, false, $q$a
b
$q$, $q$1
$q$),
  (10, false, $q$sunday
saturday
$q$, $q$3
$q$),
  (11, false, $q$cddcdbdadcbbacccbcabcabaddcbcccdacddbcacaacbdbcccddabdaddada
dadabbdcaadcdabcaaabadaaadbcbbabbaabcddaddddcaaabdcdaba
$q$, $q$36
$q$),
  (12, false, $q$dacaddbdbbbddbdbcdbdbdadccaacdbdbdbdaacadadacbacdcdabbdbaabcdbacadabbbcabddcbdbabaaccabababcbdabadaabbbbdacaddcadbcdcdacbabddabdcadcabdbcbdadaddababbcdaaaabcacdbdcdabacccdcacdcdaaacdcdcbcadabadbbcdacacbcdccbbbaacaaacbaaddcaaacdacdddbbcbbbbdcababbdaccdccdbcbdaacadddabbbababcbcdadbbcddccbcdadabdbabbaabbdcadaccccbbacbcccabadacbcdbcacdabcacccdcbababdbbbbbdbbbdcaabccbaaaaabbaddccbbbccddbcdbcadddcbdbddbbdaddaabdccdabcaacccabdacdbcaddbccccdabcabadccbcadcdbbacdcbacccbcccbdddacccdcdccccadbdcdbaacdacaddcdbcdcdcccbabccbaadcdccbbdbdcacdbdacbdadaacabbdddadaaacccadcabdbbdaacabababddbcabaaaaaaddadcadbaabadcabaccacaaabbbbddcddcdcabbcdccbdaadddbcbdbaccbddaccbdcddabacccbdacadcbcbabaddbcabacadcacdcbbcacbabbadcbbbccdbbdbbccbbadcdccdccbdaddacbbacbadaabacdbadaacddcabcbcacadacbdcddddccddbcbdbbcccddadbccdadccdacdddabdaacbdbaabbbddccaaaaaacbadbdbcaaadccccdddacadbddaddaaabadabadaccbaddbbacdddcaaadcacbaadbbbcccbdd
ddaadcdcabbaadbcbbacbcabbbacccbbadcacdcddcbcddbbddadccbbdabbcdbdacbadadaccbbdbddbddabdaacdcdbacacbdbacacbbdbcdbbbaddbbaabcbdcbdccbcdcacbbbcadabacbaaaadaddccbccbaabcbacdcaacadcdadccbadddddcaaaccccaacddaaadbdddbcdcbddccadadcbbdcbdcbcaacadcbdbcdccddbbdabaaaccaadccdbcdbbcbddacbbdccadcaabacacaaabdadddadaccadacdbbcbcbacddacbabadaaaadacbacdaaadbabaacabdaddcabbadbccbadddcabdaabcaadacbbdbaabcccdbbcabddbddacbdacdabcaadcabacbcdbdaaddabdbbbbddadcbdbdddbbddbcdaabcdcdaddccacdadbcbccaabdcdbacaaababcadbacdcbbbcacabcbabadddbbabccbbdcbabdaadacabadbabccdcbbbcaccabacbbaaacbaaaaacdccbddcbaadababdcbccdbaccbbbdbdadbdaaccdcccaddcabbdbdbdcbacdbcbdadccaacaccaacdccbaaaabaadacadbbcadbdcdaacaaddbdbbddbcabbbabcaacbbdcaabdbabbcacdbddaabdcacdcccaabaabccccababadbbcdbabdddbadcdbcbacdcdadbabacabcadcdcccdccdcccdcbccbbcbaabacdaabadacacdaabacbaacbaaddabbdccbacaaabadcbabcdbbbdbccbacbacddcaadbdaaaddddabdcccbdcbccccdbaabcbccdcadccadabbbcddbcccacddbadcbdbcddabcaddbadabdcbcacbbd
$q$, $q$483
$q$),
  (13, false, $q$bbegegchghgdcbbahcddgegdcefegeahddbbdhhchbebfbdaeagcfgdheagfhdadddabbhbfdhbfeacegbbaghgfcfebgafachagcacdgaaadfhdcdfgbccfhfghbbedbgabgbdhegbchgehghfbgbhgfaddfcchfahhcchcfacfddhdcfcgdbbdfcaabeebhgfedghfbbaacahagafbbdgghehbffffahfacaeeededdgbeacacecfgagdhcabecgbcaccdcadbbegfeaddebedehbbgdaabbcgbeegdfdbbhcggbgfgahehdbebdeebgbegedgghabbcddfagdbcdehagcgggbfgdaggdhgabehbaggdedfbeahbdaebbbcahbcabfhhhdhbbbdghgcffhbbbfhbhfedbbeegfbbhdhfchgbgbgaaacgeehhchdadcgdadacddcbgeghbedbbbbaccbacefebbahfbcgdbchbccdebcdfbbhebbbdcfgdebhebfehfbbfbechafdgaebfgafededahfdbaachfabehehdghcahbgcgghffaefbabahhfcedfbhbghfebhgbfaecacefhdghgggabdggheeaadbfhbbgagfhfbgcabdedacddebbghcffbbgeccgcbfgecbffbgeffgbfgbcdecddgbbcahfcdaabafeccgffhbedeaccaddbabhfefdcaehhhfccccadaccdafhgcffcegghggegdagdhgcaccdefdhdcacacaefefgdbggfdfgccbfbfefecfhebhehgbghhaehfddahbdbcaccdbafdcfhgeghfggdahfbceacabfdfcagdbgfccdecdgdbdafgffbeddehaehcbfdhc
bbegegchghydcbbahcddgegdcefegeahddxbdhhchbebfbdxeagcfgdheagfhdadddabbhbfdhbfeacegbbaghgfcfebgafachagcacdyaaadfhdcdfzbccfhfzhbbedbgabgbdhegbchgehghfbgbhgfaddfcchfahhcchyfacfddhdczcgdbbdycaabeebhgfxdgzfbbaazahagafbbdgghehbffffahfacaeeexeddgbeacacecfgagdhcybecgbcaccdcazbbegfeaddebedehbbgdaabbcgbeegdfdybxcggbgfgahehdbebdeybxbegedgghabbcddfagdbcdehagcgggbfgdaggdhgabehbaggdedfbzahbdaexbbcahbcabfhhhdhbbbdghgcffhbbbfhbhfedbyeegfbbhdhfchgbgbgaaaczeeyhczdadcgdadacddcbgeghbedbbbbaccbacefebbahfxcgdbchbccdebcdfbbhebbbdcfgdebhebfehfbbfbechafdgaebfgafededahfdxaachfabehehdghcahbgcgghffaefbabahhfcedybhbghfebhgbfaecacxfhdghgggabdzgheeaadbfhbbgagfhfbgcabdedacddebbghcffbbgeccgcbfgecbffbyeffgbfgbcdzcddgbbzahfcdaabafeccgffhbedeaccaddbabhfefdcaehhhfccccadaccdafhgzffcegghggegdagdhgcaccdefdhdcacacaefexgdbggfdfgccbfbfefecfhebhehgbghhaehfddahbdbcaccdbaxdcfhgeghfggdahfbcexcabfdfcagdbgfccdecdgdbdafgffbeddehaehcyfdhz
$q$, $q$39
$q$)
) AS v(position, is_sample, input, expected_output)
WHERE p.slug = $q$edit-distance$q$
ON CONFLICT (problem_id, position) DO NOTHING;

UPDATE coding_problems SET judged = true WHERE slug = $q$edit-distance$q$ AND EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = coding_problems.id);
