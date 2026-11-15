"""Easy problems (7). Each problem is a dict consumed by build.py.

py / js are two independently written reference solutions (stdin -> stdout).
brute (optional) is a slow, obviously-correct python function used by build.py to
cross-check py on small random inputs.
"""
import random


def rng(seed):
    return random.Random(seed)


def ints(r, n, lo, hi):
    return [r.randint(lo, hi) for _ in range(n)]


def line(xs):
    return ' '.join(map(str, xs))


# ---------------------------------------------------------------- 1 two-sum
def two_sum_tests():
    r = rng(1)
    t = [
        "2 6\n3 3\n",
        "3 100\n1 2 3\n",
        "4 0\n0 0 0 0\n",
        "3 4\n2 1 2\n",
        "5 -3\n-1 -2 5 -4 1\n",
        "6 10\n5 5 5 5 5 5\n",
        "4 1000000000\n500000000 500000000 1 2\n",
    ]
    for n, spread in ((200, 50), (10000, 10**9)):
        a = ints(r, n, -spread, spread)
        i, j = sorted(r.sample(range(n), 2))
        t.append(f"{n} {a[i] + a[j]}\n{line(a)}\n")
    a = list(range(1, 30001))
    t.append(f"10000 19999\n{line(a)}\n")  # answer is the last two elements
    t.append(f"10000 -7\n{line(a)}\n")  # no pair
    return t


def two_sum_brute(s):
    h = s.split('\n')
    n, T = map(int, h[0].split())
    a = list(map(int, h[1].split()))
    for i in range(n):
        for j in range(i + 1, n):
            if a[i] + a[j] == T:
                return f"{i} {j}"
    return "-1"


def two_sum_small(r):
    n = r.randint(2, 9)
    a = ints(r, n, -6, 6)
    return f"{n} {r.randint(-8, 8)}\n{line(a)}\n"


TWO_SUM = dict(
    slug='two-sum-indices', title='Two Sum Indices', difficulty='Easy', category='Arrays',
    tags=['array', 'hash-map'], points=10,
    statement=(
        "Given an array of integers and a target value T, find two different positions i < j "
        "such that a[i] + a[j] = T.\n\n"
        "If several pairs exist, print the pair with the smallest i. If that still leaves several "
        "choices, print the one with the smallest j. If no pair exists, print -1."
    ),
    input_format="Line 1: two integers n and T.\nLine 2: n integers a[0] … a[n-1].",
    output_format="Two integers i and j separated by a space (0-based), or -1.",
    constraints=["2 ≤ n ≤ 10 000", "-10^9 ≤ a[i] ≤ 10^9", "-2·10^9 ≤ T ≤ 2·10^9"],
    samples=[
        ("4 9\n2 7 11 15\n", "0 1\n", "a[0] + a[1] = 2 + 7 = 9."),
        ("3 6\n3 2 4\n", "1 2\n", "Only 2 + 4 reaches 6. Using 3 twice is not allowed."),
    ],
    hidden=two_sum_tests, brute=two_sum_brute, small=two_sum_small,
    editorial=(
        "Checking every pair is O(n²) and too slow for n = 50 000. Walk the array from right to left "
        "and keep a map from value to the smallest index seen so far to the right. For each i, "
        "look up T - a[i]. A hit gives the best j for that i. Because i decreases, the last hit "
        "recorded is the one with the smallest i. Total time O(n)."
    ),
    py='''import sys
from bisect import bisect_right
def main():
    d = sys.stdin.read().split()
    n, T = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    pos = {}
    for i, v in enumerate(a):
        pos.setdefault(v, []).append(i)
    for i in range(n):
        lst = pos.get(T - a[i])
        if lst:
            k = bisect_right(lst, i)
            if k < len(lst):
                print(i, lst[k])
                return
    print(-1)
main()
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], T = d[1], a = d.slice(2, 2 + n);
const next = new Map();
let best = null;
for (let i = n - 1; i >= 0; i--) {
  if (next.has(T - a[i])) best = [i, next.get(T - a[i])];
  next.set(a[i], i);
}
console.log(best ? best.join(' ') : '-1');
''',
)


# ------------------------------------------------------- 2 valid parentheses
def parens_tests():
    r = rng(2)
    t = [
        "\n",
        "[\n",
        "]\n",
        "{[(])}\n",
        "{[()()]}[]\n",
        "(((((((((())))))))))\n",
        "((())\n",
        "())(\n",
    ]
    t.append("(" * 5000 + ")" * 5000 + "\n")
    t.append("(" * 5000 + "]" + ")" * 4999 + "\n")
    s = []
    stack = []
    pairs = {'(': ')', '[': ']', '{': '}'}
    for _ in range(9000):
        if stack and r.random() < 0.5:
            s.append(pairs[stack.pop()])
        else:
            o = r.choice('([{')
            stack.append(o)
            s.append(o)
    while stack:
        s.append(pairs[stack.pop()])
    t.append(''.join(s) + "\n")
    return t


def parens_brute(s):
    s = s.strip()
    while True:
        n = s.replace('()', '').replace('[]', '').replace('{}', '')
        if n == s:
            break
        s = n
    return 'YES' if s == '' else 'NO'


def parens_small(r):
    return ''.join(r.choice('()[]{}') for _ in range(r.randint(0, 10))) + "\n"


PARENS = dict(
    slug='valid-parentheses', title='Valid Parentheses', difficulty='Easy', category='Stacks',
    tags=['stack', 'string'], points=10,
    statement=(
        "A string made only of the characters ( ) [ ] { } is valid when every opening bracket is "
        "closed by the same kind of bracket, and brackets close in the correct order.\n\n"
        "Decide whether the given string is valid. The empty string is valid."
    ),
    input_format="One line containing the string. The line may be empty.",
    output_format="YES if the string is valid, otherwise NO.",
    constraints=["0 ≤ length ≤ 10 000"],
    samples=[
        ("()[]{}\n", "YES\n", "Each bracket is closed right away."),
        ("([)]\n", "NO\n", "The ] arrives while ( is still the innermost open bracket."),
    ],
    hidden=parens_tests, brute=parens_brute, small=parens_small,
    editorial=(
        "Scan left to right with a stack. Push opening brackets. On a closing bracket the stack must "
        "be non-empty and its top must be the matching opener, otherwise the answer is NO. "
        "At the end the stack must be empty. O(n) time."
    ),
    py='''import sys
s = sys.stdin.read().strip()
m = {')': '(', ']': '[', '}': '{'}
st = []
ok = True
for c in s:
    if c in '([{':
        st.append(c)
    elif not st or st.pop() != m[c]:
        ok = False
        break
print('YES' if ok and not st else 'NO')
''',
    js='''let s = require('fs').readFileSync(0, 'utf8').trim();
let prev;
do {
  prev = s;
  s = s.split('()').join('').split('[]').join('').split('{}').join('');
} while (s !== prev);
console.log(s === '' ? 'YES' : 'NO');
''',
)


# ------------------------------------------------------------- 3 reverse words
def reverse_tests():
    r = rng(3)
    t = [
        "   \n",
        "hello\n",
        "  leading and trailing  \n",
        "a  b   c    d\n",
        "one\n",
        "x1 y2 z3\n",
    ]
    words = [''.join(r.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(r.randint(1, 8))) for _ in range(5000)]
    t.append(' ' * r.randint(0, 3) + (' ' * 2).join(words) + "  \n")
    return t


def reverse_brute(s):
    words, cur = [], ''
    for c in s:
        if c in ' \n':
            if cur:
                words.append(cur)
            cur = ''
        else:
            cur += c
    if cur:
        words.append(cur)
    return ' '.join(reversed(words))


def reverse_small(r):
    return ' ' * r.randint(0, 2) + (' ' * r.randint(1, 3)).join(
        ''.join(r.choice('ab1') for _ in range(r.randint(1, 3))) for _ in range(r.randint(0, 5))) + ' ' * r.randint(0, 2) + "\n"


REVERSE = dict(
    slug='reverse-words', title='Reverse the Words', difficulty='Easy', category='Strings',
    tags=['string'], points=10,
    statement=(
        "Words are runs of letters and digits separated by one or more spaces. The line may have "
        "spaces at the start and the end.\n\n"
        "Print the words in reverse order, separated by exactly one space, with no leading or trailing "
        "spaces. The letters inside each word keep their order. If the line contains no words, print an empty line."
    ),
    input_format="One line of text.",
    output_format="The words in reverse order, single-space separated.",
    constraints=["0 ≤ length of the line ≤ 30 000", "Characters are letters, digits and spaces"],
    samples=[
        ("  the sky   is blue \n", "blue is sky the\n", "Extra spaces disappear."),
        ("solo\n", "solo\n", "One word stays as it is."),
    ],
    hidden=reverse_tests, brute=reverse_brute, small=reverse_small,
    editorial=(
        "Split on runs of whitespace, reverse the list, join with a single space. "
        "Splitting by a single space instead leaves empty strings in the list, which is the usual bug. O(n)."
    ),
    py='''import sys
print(' '.join(reversed(sys.stdin.read().split())))
''',
    js='''const s = require('fs').readFileSync(0, 'utf8');
const words = [];
let cur = '';
for (const ch of s) {
  if (ch === ' ' || ch === '\\n' || ch === '\\r' || ch === '\\t') {
    if (cur) { words.push(cur); cur = ''; }
  } else cur += ch;
}
if (cur) words.push(cur);
console.log(words.reverse().join(' '));
''',
)


# ---------------------------------------------------------------- 4 palindrome
def pal_tests():
    r = rng(4)
    t = [
        "\n",
        "!!! ???\n",
        "a\n",
        "ab\n",
        "No lemon, no melon\n",
        "0P\n",
        "race a cars\n",
        "Was it a car or a cat I saw?\n",
        "12321\n",
        "1231\n",
    ]
    half = ''.join(r.choice('abcXYZ0123 ,.') for _ in range(10000))
    t.append(half + 'q' + half[::-1] + "\n")
    t.append(half + 'q' + half[::-1][:-1] + 'z\n')
    return t


def pal_brute(s):
    f = [c.lower() for c in s if c.isalnum()]
    return 'YES' if f == f[::-1] else 'NO'


def pal_small(r):
    return ''.join(r.choice('aAb1 ,') for _ in range(r.randint(0, 9))) + "\n"


PALINDROME = dict(
    slug='palindrome-check', title='Palindrome Check', difficulty='Easy', category='Strings',
    tags=['string', 'two-pointers'], points=10,
    statement=(
        "A phrase is a palindrome if, after ignoring every character that is not a letter or a digit "
        "and ignoring the difference between upper and lower case, it reads the same forwards and backwards.\n\n"
        "Decide whether the given line is a palindrome. A line with no letters or digits counts as a palindrome."
    ),
    input_format="One line of ASCII text. It may be empty.",
    output_format="YES or NO.",
    constraints=["0 ≤ length ≤ 30 000", "ASCII characters only"],
    samples=[
        ("A man, a plan, a canal: Panama\n", "YES\n", "Filtered and lowercased: amanaplanacanalpanama."),
        ("race a car\n", "NO\n", "Filtered: raceacar."),
    ],
    hidden=pal_tests, brute=pal_brute, small=pal_small,
    editorial=(
        "Use two pointers from both ends. Skip characters that are not alphanumeric, then compare the "
        "lowercased characters. Stop at the first mismatch. O(n) time, O(1) extra space."
    ),
    py='''import sys
s = sys.stdin.read()
i, j = 0, len(s) - 1
ok = True
while i < j:
    if not s[i].isalnum():
        i += 1
    elif not s[j].isalnum():
        j -= 1
    else:
        if s[i].lower() != s[j].lower():
            ok = False
            break
        i += 1
        j -= 1
print('YES' if ok else 'NO')
''',
    js='''const s = require('fs').readFileSync(0, 'utf8');
const f = s.toLowerCase().replace(/[^a-z0-9]/g, '');
console.log(f === f.split('').reverse().join('') ? 'YES' : 'NO');
''',
)


# ---------------------------------------------------------------- 5 lower bound
def lb_tests():
    r = rng(5)
    t = [
        "1 3\n5\n4 5 6\n",
        "5 5\n1 2 2 2 9\n0 2 3 9 10\n",
        "4 4\n-5 -5 0 7\n-6 -5 -4 8\n",
        "3 3\n7 7 7\n7 6 8\n",
    ]
    for n, q, spread in ((100, 100, 40), (10000, 10000, 10**6)):
        a = sorted(ints(r, n, -spread, spread))
        qs = ints(r, q, -spread - 2, spread + 2)
        t.append(f"{n} {q}\n{line(a)}\n{line(qs)}\n")
    return t


def lb_brute(s):
    d = s.split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    qs = list(map(int, d[2 + n:2 + n + q]))
    out = []
    for x in qs:
        k = 0
        while k < n and a[k] < x:
            k += 1
        out.append(k)
    return '\n'.join(map(str, out))


def lb_small(r):
    n, q = r.randint(1, 8), r.randint(1, 8)
    a = sorted(ints(r, n, -5, 5))
    return f"{n} {q}\n{line(a)}\n{line(ints(r, q, -7, 7))}\n"


LOWER_BOUND = dict(
    slug='first-not-smaller', title='First Not Smaller', difficulty='Easy', category='Binary Search',
    tags=['binary-search', 'array'], points=10,
    statement=(
        "You are given an array sorted in non-decreasing order and q queries. For each query value x, "
        "print the smallest index i with a[i] ≥ x. If every element is smaller than x, print n."
    ),
    input_format="Line 1: n and q.\nLine 2: n integers in non-decreasing order.\nLine 3: q integers, the queries.",
    output_format="q lines. Line k holds the answer to query k.",
    constraints=["1 ≤ n, q ≤ 10 000", "-10^6 ≤ a[i], x ≤ 10^6"],
    samples=[
        ("5 4\n1 3 3 5 8\n0 3 4 9\n", "0\n1\n3\n5\n", "3 first appears at index 1; nothing is ≥ 9, so the answer is n = 5."),
        ("1 2\n7\n7 8\n", "0\n1\n", ""),
    ],
    hidden=lb_tests, brute=lb_brute, small=lb_small,
    editorial=(
        "Binary search on the answer. Keep lo = 0, hi = n. While lo < hi take mid; if a[mid] < x the answer "
        "is to the right (lo = mid + 1), otherwise hi = mid. O(log n) per query. "
        "Scanning from the left is O(n) per query and too slow at the upper limits."
    ),
    py='''import sys
from bisect import bisect_left
d = sys.stdin.read().split()
n, q = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
qs = list(map(int, d[2 + n:2 + n + q]))
print('\\n'.join(str(bisect_left(a, x)) for x in qs))
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], q = d[1];
const a = d.slice(2, 2 + n);
const out = [];
for (let k = 0; k < q; k++) {
  const x = d[2 + n + k];
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1; else hi = mid;
  }
  out.push(lo);
}
console.log(out.join('\\n'));
''',
)


# ---------------------------------------------------------------- 6 primes
def primes_tests():
    return ["0\n", "1\n", "2\n", "3\n", "4\n", "97\n", "100\n", "1000\n", "99991\n", "1000000\n", "999983\n"]


def primes_brute(s):
    n = int(s)
    return str(sum(1 for k in range(2, n + 1) if all(k % d for d in range(2, int(k ** 0.5) + 1))))


def primes_small(r):
    return f"{r.randint(0, 300)}\n"


PRIMES = dict(
    slug='count-primes', title='Count Primes', difficulty='Easy', category='Math',
    tags=['math', 'sieve'], points=10,
    statement="Given an integer n, count the prime numbers p with p ≤ n.",
    input_format="One integer n.",
    output_format="One integer, the number of primes up to and including n.",
    constraints=["0 ≤ n ≤ 1 000 000"],
    samples=[
        ("10\n", "4\n", "The primes are 2, 3, 5 and 7."),
        ("2\n", "1\n", ""),
    ],
    hidden=primes_tests, brute=primes_brute, small=primes_small,
    editorial=(
        "Use the sieve of Eratosthenes: mark multiples of every prime starting from p·p. "
        "That is O(n log log n), fast enough for n = 10^6. Testing each number by trial division works "
        "for small n but gets slow near the limit."
    ),
    py='''n = int(input())
if n < 2:
    print(0)
else:
    s = bytearray([1]) * (n + 1)
    s[0] = s[1] = 0
    i = 2
    while i * i <= n:
        if s[i]:
            s[i * i::i] = bytearray(len(range(i * i, n + 1, i)))
        i += 1
    print(sum(s))
''',
    js='''const n = parseInt(require('fs').readFileSync(0, 'utf8').trim(), 10);
let c = 0;
const primes = [];
for (let k = 2; k <= n; k++) {
  let p = true;
  for (let i = 0; i < primes.length && primes[i] * primes[i] <= k; i++) {
    if (k % primes[i] === 0) { p = false; break; }
  }
  if (p) { primes.push(k); c++; }
}
console.log(c);
''',
)


# ---------------------------------------------------------------- 7 merge
def merge_tests():
    r = rng(7)
    t = [
        "0 0\n\n\n",
        "0 3\n\n1 2 3\n",
        "3 0\n4 5 6\n\n",
        "3 3\n1 2 3\n4 5 6\n",
        "3 3\n4 5 6\n1 2 3\n",
        "4 4\n1 1 1 1\n1 1 1 1\n",
        "3 2\n-3 0 3\n-3 3\n",
    ]
    for n, m in ((300, 200), (5000, 5000)):
        a = sorted(ints(r, n, -10**9, 10**9))
        b = sorted(ints(r, m, -10**9, 10**9))
        t.append(f"{n} {m}\n{line(a)}\n{line(b)}\n")
    return t


def merge_brute(s):
    d = s.split()
    n, m = int(d[0]), int(d[1])
    return line(sorted(map(int, d[2:2 + n + m])))


def merge_small(r):
    n, m = r.randint(0, 6), r.randint(0, 6)
    return f"{n} {m}\n{line(sorted(ints(r, n, -5, 5)))}\n{line(sorted(ints(r, m, -5, 5)))}\n"


MERGE = dict(
    slug='merge-sorted-arrays', title='Merge Two Sorted Arrays', difficulty='Easy', category='Arrays',
    tags=['array', 'two-pointers'], points=10,
    statement=(
        "Two arrays are each sorted in non-decreasing order. Merge them into one array that is also sorted "
        "in non-decreasing order, in linear time. Either array can be empty."
    ),
    input_format="Line 1: n and m.\nLine 2: n integers (empty when n = 0).\nLine 3: m integers (empty when m = 0).",
    output_format="The merged array on one line, separated by spaces. Print an empty line when both are empty.",
    constraints=["0 ≤ n, m ≤ 5 000", "-10^9 ≤ values ≤ 10^9"],
    samples=[
        ("3 3\n1 4 9\n2 3 10\n", "1 2 3 4 9 10\n", ""),
        ("0 2\n\n5 6\n", "5 6\n", "The first array is empty, so its line is blank."),
    ],
    hidden=merge_tests, brute=merge_brute, small=merge_small,
    editorial=(
        "Keep one pointer in each array. Repeatedly copy the smaller front element and advance that pointer; "
        "when one array runs out, copy the rest of the other. O(n + m). Sorting the concatenation also passes "
        "at these sizes, but the two-pointer merge is the intended solution."
    ),
    py='''import sys
d = sys.stdin.read().split()
n, m = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
b = list(map(int, d[2 + n:2 + n + m]))
i = j = 0
out = []
while i < n and j < m:
    if a[i] <= b[j]:
        out.append(a[i]); i += 1
    else:
        out.append(b[j]); j += 1
out += a[i:]
out += b[j:]
print(' '.join(map(str, out)))
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], m = d[1];
const all = d.slice(2, 2 + n + m);
all.sort((x, y) => x - y);
console.log(all.join(' '));
''',
)

EASY = [TWO_SUM, PARENS, REVERSE, PALINDROME, LOWER_BOUND, PRIMES, MERGE]
