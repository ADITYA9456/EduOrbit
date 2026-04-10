/* eslint-disable no-console */

// Seeds a handful of ORIGINAL demo problems into `coding_problems`.
// Safe to re-run: uses upsert on `slug`.
// NOTE: This writes to your Supabase database using the SERVICE ROLE key.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function demoProblems() {
  return [
    {
      slug: 'array-pair-sum',
      title: 'Array Pair Sum',
      description:
        'Given an array of integers and a target integer, determine if there exists a pair of distinct elements whose sum equals the target.\n\nReturn true if such a pair exists, otherwise return false.',
      difficulty: 'Easy',
      category: 'DSA',
      type: 'code',
      tags: ['arrays', 'two-sum', 'hashing'],
      starter_code: {
        javascript:
          "// input: { nums: number[], target: number }\nfunction solution(input) {\n  const { nums, target } = input;\n  // TODO\n  return false;\n}\n",
        python:
          "# input: { 'nums': List[int], 'target': int }\ndef solution(input):\n    nums = input['nums']\n    target = input['target']\n    # TODO\n    return False\n",
      },
      examples: [
        { input: '{ nums: [2, 7, 11, 15], target: 9 }', output: 'true', explanation: '2 + 7 = 9' },
        { input: '{ nums: [1, 2, 3], target: 7 }', output: 'false' },
      ],
      test_cases: [
        { input: '{"nums":[2,7,11,15],"target":9}', expected_output: 'true' },
        { input: '{"nums":[3,3],"target":6}', expected_output: 'true' },
        { input: '{"nums":[1,2,3],"target":7}', expected_output: 'false' },
      ],
      constraints: ['2 ≤ nums.length ≤ 1e5', '-1e9 ≤ nums[i], target ≤ 1e9'],
      points: 10,
      order_index: 1,
    },
    {
      slug: 'reverse-words',
      title: 'Reverse Words (Keep Spacing Simple)',
      description:
        "Given a sentence as a string, reverse the order of words.\n\nAssume words are separated by single spaces and there are no leading/trailing spaces.",
      difficulty: 'Easy',
      category: 'Python',
      type: 'code',
      tags: ['strings'],
      starter_code: {
        javascript:
          "function solution(input) {\n  const s = input.s;\n  // TODO\n  return '';\n}\n",
        python:
          "def solution(input):\n    s = input['s']\n    # TODO\n    return ''\n",
      },
      examples: [
        { input: '{ s: "learn to code" }', output: '"code to learn"' },
        { input: '{ s: "hello world" }', output: '"world hello"' },
      ],
      test_cases: [
        { input: '{"s":"learn to code"}', expected_output: 'code to learn' },
        { input: '{"s":"hello world"}', expected_output: 'world hello' },
      ],
      constraints: ['1 ≤ number of words ≤ 1e4'],
      points: 10,
      order_index: 2,
    },
    {
      slug: 'binary-search-complexity-mcq',
      title: 'Binary Search Complexity',
      description:
        'You have a sorted array of size n and you perform binary search. What is the time complexity in the worst case?',
      difficulty: 'Easy',
      category: 'DSA',
      type: 'mcq',
      tags: ['binary-search', 'complexity'],
      mcq_options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correct_answer: 'O(log n)',
      points: 5,
      order_index: 3,
    },
    {
      slug: 'sql-active-users',
      title: 'SQL: Active Users (Last 7 Days)',
      description:
        'You are given a table `user_logins(user_id, logged_in_at)` with one row per login event.\n\nWrite a SQL query to return the distinct `user_id`s that logged in during the last 7 days (inclusive).\n\nReturn a single column: user_id.',
      difficulty: 'Medium',
      category: 'SQL',
      type: 'sql',
      tags: ['sql', 'dates', 'distinct'],
      starter_code: {
        sql: '-- SELECT DISTINCT user_id\n-- FROM user_logins\n-- WHERE ...\n',
      },
      examples: [
        { input: 'Assume today = 2026-04-10', output: 'All users with logins from 2026-04-04 to 2026-04-10' },
      ],
      test_cases: [
        { input: 'N/A (SQL)', expected_output: 'Query returns correct user_id set' },
      ],
      constraints: ['Use DISTINCT', 'Use a date filter for last 7 days'],
      points: 25,
      order_index: 4,
    },
    {
      slug: 'webdev-form-validation',
      title: 'WebDev: Validate Signup Form',
      description:
        'Implement basic client-side validation rules for a signup form:\n- email must contain @\n- password length must be at least 8\n- confirmPassword must match password\n\nReturn an object of errors where each key is a field name and the value is a human-readable message.',
      difficulty: 'Medium',
      category: 'WebDev',
      type: 'code',
      tags: ['validation', 'objects'],
      starter_code: {
        javascript:
          "function solution(input) {\n  const { email, password, confirmPassword } = input;\n  const errors = {};\n  // TODO\n  return errors;\n}\n",
      },
      examples: [
        {
          input: '{ email: "abc", password: "123", confirmPassword: "1234" }',
          output: '{ email: "Invalid email", password: "Password too short", confirmPassword: "Passwords do not match" }',
        },
      ],
      test_cases: [
        { input: '{"email":"abc","password":"123","confirmPassword":"1234"}', expected_output: 'errors.email, errors.password, errors.confirmPassword present' },
        { input: '{"email":"a@b.com","password":"12345678","confirmPassword":"12345678"}', expected_output: '{}' },
      ],
      constraints: ['Keep messages simple and consistent'],
      points: 25,
      order_index: 5,
    },
  ];
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = demoProblems();

  const { data, error } = await supabase
    .from('coding_problems')
    .upsert(rows, { onConflict: 'slug' })
    .select('id, slug');

  if (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Seeded ${data?.length || 0} coding_problems.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err?.message || err);
  process.exitCode = 1;
});
