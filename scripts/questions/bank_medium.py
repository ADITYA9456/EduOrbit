"""Medium problems (8). See bank_easy.py for the dict layout."""
from bank_easy import rng, ints, line


# ------------------------------------------------------ 8 max subarray sum
def msub_tests():
    r = rng(8)
    t = [
        "1\n-5\n",
        "1\n7\n",
        "5\n-3 -1 -2 -8 -4\n",
        "8\n-2 1 -3 4 -1 2 1 -5\n",
        "6\n5 4 -1 7 8 -20\n",
        "4\n0 0 0 0\n",
        "5\n10000 -10000 10000 -10000 10000\n",
    ]
    t.append(f"10000\n{line(ints(r, 10000, -10000, 10000))}\n")
    t.append(f"10000\n{line([10000] * 10000)}\n")
    t.append(f"10000\n{line([-1] * 29999 + [-9999])}\n")
    return t


def msub_brute(s):
    d = list(map(int, s.split()))
    n, a = d[0], d[1:1 + d[0]]
    return str(max(sum(a[i:j + 1]) for i in range(n) for j in range(i, n)))


def msub_small(r):
    n = r.randint(1, 9)
    return f"{n}\n{line(ints(r, n, -9, 9))}\n"


MAX_SUBARRAY = dict(
    slug='maximum-subarray-sum', title='Maximum Subarray Sum', difficulty='Medium', category='Dynamic Programming',
    tags=['array', 'dynamic-programming', 'kadane'], points=25,
    statement=(
        "Find the largest possible sum of a contiguous, non-empty part of the array.\n\n"
        "The array can contain negative numbers. If every number is negative, the answer is the "
        "largest (least negative) single element."
    ),
    input_format="Line 1: n.\nLine 2: n integers.",
    output_format="One integer, the maximum sum.",
    constraints=["1 ≤ n ≤ 10 000", "-10^4 ≤ a[i] ≤ 10^4"],
    samples=[
        ("8\n-2 1 -3 4 -1 2 1 -5\n", "6\n", "The subarray 4, -1, 2, 1 sums to 6."),
        ("3\n-4 -2 -9\n", "-2\n", "All values are negative, so take the single best element."),
    ],
    hidden=msub_tests, brute=msub_brute, small=msub_small,
    editorial=(
        "Let best_here be the best sum of a subarray ending at the current position. "
        "It is either the current element alone or the current element added to the previous best_here: "
        "best_here = max(a[i], best_here + a[i]). The answer is the maximum over all positions. "
        "Start best with the first element, not 0, so that all-negative arrays are handled. O(n)."
    ),
    py='''import sys
d = sys.stdin.read().split()
n = int(d[0])
a = list(map(int, d[1:1 + n]))
cur = best = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
print(best)
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0];
let prefix = 0, minPrefix = 0, best = -Infinity;
for (let i = 1; i <= n; i++) {
  prefix += d[i];
  if (prefix - minPrefix > best) best = prefix - minPrefix;
  if (prefix < minPrefix) minPrefix = prefix;
}
// the loop above allows an empty prefix before the first element, which is correct for non-empty subarrays
console.log(best);
''',
)


# --------------------------------------------- 9 longest unique substring
def lus_tests():
    r = rng(9)
    t = [
        "\n",
        "a\n",
        "aaaaaaa\n",
        "abcabcbb\n",
        "pwwkew\n",
        "abba\n",
        "dvdf\n",
        "tmmzuxt\n",
        "abcdefghijklmnopqrstuvwxyz\n",
        "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz\n",
    ]
    t.append(''.join(r.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(10000)) + "\n")
    t.append(''.join(r.choice('ab') for _ in range(10000)) + "\n")
    return t


def lus_brute(s):
    s = s.strip()
    best = 0
    for i in range(len(s)):
        for j in range(i, len(s)):
            if len(set(s[i:j + 1])) == j - i + 1:
                best = max(best, j - i + 1)
    return str(best)


def lus_small(r):
    return ''.join(r.choice('abc') for _ in range(r.randint(0, 12))) + "\n"


LONGEST_UNIQUE = dict(
    slug='longest-unique-substring', title='Longest Substring Without Repeats', difficulty='Medium', category='Strings',
    tags=['string', 'sliding-window', 'hash-map'], points=25,
    statement=(
        "Given a string of lowercase letters, find the length of the longest substring in which no "
        "character appears twice. A substring is a contiguous part of the string."
    ),
    input_format="One line with the string. The line may be empty.",
    output_format="One integer, the length of the longest such substring (0 for an empty string).",
    constraints=["0 ≤ length ≤ 10 000", "Lowercase English letters only"],
    samples=[
        ("abcabcbb\n", "3\n", "The longest is abc."),
        ("pwwkew\n", "3\n", "wke has length 3. pwke is not contiguous."),
    ],
    hidden=lus_tests, brute=lus_brute, small=lus_small,
    editorial=(
        "Slide a window [left, right]. Store the last index where each character was seen. "
        "When s[right] was seen at an index ≥ left, move left to that index + 1. "
        "Update the best length after each step. Never move left backwards (the case abba shows why). O(n)."
    ),
    py='''import sys
s = sys.stdin.read().strip()
last = {}
left = best = 0
for i, c in enumerate(s):
    if c in last and last[c] >= left:
        left = last[c] + 1
    last[c] = i
    best = max(best, i - left + 1)
print(best)
''',
    js='''const s = require('fs').readFileSync(0, 'utf8').trim();
const window = new Set();
let left = 0, best = 0;
for (let right = 0; right < s.length; right++) {
  while (window.has(s[right])) { window.delete(s[left]); left++; }
  window.add(s[right]);
  if (window.size > best) best = window.size;
}
console.log(best);
''',
)


# ------------------------------------------------------------ 10 coin change
def coin_tests():
    r = rng(10)
    t = [
        "1 0\n5\n",
        "1 3\n2\n",
        "3 11\n1 2 5\n",
        "4 6249\n186 419 83 408\n",
        "2 7\n2 4\n",
        "3 9999\n7 13 29\n",
        "1 10000\n1\n",
        "3 100\n1 5 10\n",
        "2 8\n6 4\n",
    ]
    for _ in range(3):
        n = r.randint(5, 40)
        coins = sorted(set(ints(r, n, 2, 500)))
        t.append(f"{len(coins)} {r.randint(5000, 10000)}\n{line(coins)}\n")
    return t


def coin_brute(s):
    d = list(map(int, s.split()))
    n, amt = d[0], d[1]
    coins = d[2:2 + n]
    from collections import deque
    dist = {0: 0}
    q = deque([0])
    while q:
        x = q.popleft()
        for c in coins:
            y = x + c
            if y <= amt and y not in dist:
                dist[y] = dist[x] + 1
                q.append(y)
    return str(dist.get(amt, -1))


def coin_small(r):
    n = r.randint(1, 4)
    coins = sorted(set(ints(r, n, 1, 9)))
    return f"{len(coins)} {r.randint(0, 40)}\n{line(coins)}\n"


COIN_CHANGE = dict(
    slug='fewest-coins', title='Fewest Coins', difficulty='Medium', category='Dynamic Programming',
    tags=['dynamic-programming', 'unbounded-knapsack'], points=25,
    statement=(
        "You have coins of several distinct denominations and an unlimited supply of each. "
        "Find the smallest number of coins that add up to exactly the given amount.\n\n"
        "If the amount cannot be made, print -1. The amount 0 needs 0 coins."
    ),
    input_format="Line 1: n (number of denominations) and the amount.\nLine 2: the n denominations.",
    output_format="One integer: the minimum number of coins, or -1.",
    constraints=["1 ≤ n ≤ 100", "1 ≤ denomination ≤ 10 000", "0 ≤ amount ≤ 10 000"],
    samples=[
        ("3 11\n1 2 5\n", "3\n", "5 + 5 + 1."),
        ("1 3\n2\n", "-1\n", "Only even totals are possible."),
    ],
    hidden=coin_tests, brute=coin_brute, small=coin_small,
    editorial=(
        "Greedy (always take the biggest coin) fails, for example with coins 1, 3, 4 and amount 6. "
        "Use dynamic programming: dp[x] is the fewest coins for amount x, with dp[0] = 0 and "
        "dp[x] = 1 + min(dp[x - c]) over coins c ≤ x. The answer is dp[amount], or -1 if it is still infinite. "
        "O(n · amount)."
    ),
    py='''import sys
d = sys.stdin.read().split()
n, amt = int(d[0]), int(d[1])
coins = list(map(int, d[2:2 + n]))
INF = float('inf')
dp = [0] + [INF] * amt
for x in range(1, amt + 1):
    for c in coins:
        if c <= x and dp[x - c] + 1 < dp[x]:
            dp[x] = dp[x - c] + 1
print(dp[amt] if dp[amt] != INF else -1)
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], amt = d[1], coins = d.slice(2, 2 + n);
const dist = new Int32Array(amt + 1).fill(-1);
dist[0] = 0;
let frontier = [0], steps = 0;
while (frontier.length && dist[amt] === -1) {
  steps++;
  const next = [];
  for (const x of frontier) {
    for (const c of coins) {
      const y = x + c;
      if (y <= amt && dist[y] === -1) { dist[y] = steps; next.push(y); }
    }
  }
  frontier = next;
}
console.log(dist[amt]);
''',
)


# -------------------------------------------------------------- 11 islands
def grid_text(rows):
    return f"{len(rows)} {len(rows[0])}\n" + '\n'.join(rows) + "\n"


def islands_tests():
    r = rng(11)
    t = [
        grid_text(["0"]),
        grid_text(["1"]),
        grid_text(["111", "111", "111"]),
        grid_text(["101", "010", "101"]),
        grid_text(["11000", "11000", "00100", "00011"]),
        grid_text(["1111111", "1000001", "1011101", "1010101", "1011101", "1000001", "1111111"]),
        grid_text(["1" * 7]),
        grid_text(["0" * 5, "0" * 5]),
    ]
    for p in (0.45, 0.6):
        rows = [''.join('1' if r.random() < p else '0' for _ in range(220)) for _ in range(220)]
        t.append(grid_text(rows))
    return t


def islands_brute(s):
    d = s.split('\n')
    R, C = map(int, d[0].split())
    g = [list(d[1 + i]) for i in range(R)]
    import sys
    sys.setrecursionlimit(10000)

    def dfs(i, j):
        if 0 <= i < R and 0 <= j < C and g[i][j] == '1':
            g[i][j] = '0'
            dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1)

    n = 0
    for i in range(R):
        for j in range(C):
            if g[i][j] == '1':
                n += 1
                dfs(i, j)
    return str(n)


def islands_small(r):
    R, C = r.randint(1, 6), r.randint(1, 6)
    return grid_text([''.join(r.choice('01') for _ in range(C)) for _ in range(R)])


ISLANDS = dict(
    slug='count-islands', title='Count the Islands', difficulty='Medium', category='Graphs',
    tags=['graph', 'bfs', 'dfs', 'grid'], points=25,
    statement=(
        "A map is a grid of 0 (water) and 1 (land). An island is a group of land cells connected "
        "horizontally or vertically (diagonals do not connect). Count the islands."
    ),
    input_format="Line 1: R and C.\nNext R lines: each a string of C characters, 0 or 1, with no spaces.",
    output_format="One integer, the number of islands.",
    constraints=["1 ≤ R, C ≤ 220"],
    samples=[
        ("4 5\n11000\n11000\n00100\n00011\n", "3\n", "Top-left block, the single middle cell, and the bottom-right pair."),
        ("3 3\n101\n010\n101\n", "5\n", "Diagonal neighbours are separate islands."),
    ],
    hidden=islands_tests, brute=islands_brute, small=islands_small,
    editorial=(
        "Scan every cell. When you meet unvisited land, count one island and flood-fill it (BFS or DFS) "
        "so its cells are marked visited. Use an explicit stack or queue instead of recursion, "
        "because a snake-shaped island can be tens of thousands of cells deep. O(R·C)."
    ),
    py='''import sys
from collections import deque
d = sys.stdin.read().split('\\n')
R, C = map(int, d[0].split())
g = [bytearray(d[1 + i].strip().encode()) for i in range(R)]
count = 0
for i in range(R):
    for j in range(C):
        if g[i][j] == 49:
            count += 1
            g[i][j] = 48
            q = deque([(i, j)])
            while q:
                x, y = q.popleft()
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < R and 0 <= ny < C and g[nx][ny] == 49:
                        g[nx][ny] = 48
                        q.append((nx, ny))
print(count)
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split('\\n');
const [R, C] = d[0].split(' ').map(Number);
const grid = [];
for (let i = 0; i < R; i++) grid.push(d[1 + i].trim());
const parent = new Int32Array(R * C).map((_, i) => i);
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
  if (grid[i][j] !== '1') continue;
  if (i > 0 && grid[i - 1][j] === '1') union(i * C + j, (i - 1) * C + j);
  if (j > 0 && grid[i][j - 1] === '1') union(i * C + j, i * C + j - 1);
}
const roots = new Set();
for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (grid[i][j] === '1') roots.add(find(i * C + j));
console.log(roots.size);
''',
)


# ---------------------------------------------------------- 12 meeting rooms
def rooms_tests():
    r = rng(12)
    t = [
        "1\n0 5\n",
        "2\n0 5\n5 10\n",
        "3\n0 30\n5 10\n15 20\n",
        "3\n7 10\n2 4\n1 9\n",
        "4\n1 2\n1 2\n1 2\n1 2\n",
        "5\n1 10\n2 9\n3 8\n4 7\n5 6\n",
        "4\n0 1000000000\n0 1\n1 2\n2 3\n",
    ]
    for n, hi in ((300, 1000), (10000, 10**6)):
        iv = []
        for _ in range(n):
            s = r.randint(0, hi - 1)
            iv.append((s, r.randint(s + 1, min(hi, s + hi // 10 + 1))))
        t.append(f"{n}\n" + '\n'.join(f"{a} {b}" for a, b in iv) + "\n")
    return t


def rooms_brute(s):
    d = list(map(int, s.split()))
    n = d[0]
    iv = [(d[1 + 2 * i], d[2 + 2 * i]) for i in range(n)]
    return str(max(sum(1 for a, b in iv if a <= x < b) for x, _ in iv))


def rooms_small(r):
    n = r.randint(1, 7)
    iv = []
    for _ in range(n):
        a = r.randint(0, 9)
        iv.append((a, r.randint(a + 1, 10)))
    return f"{n}\n" + '\n'.join(f"{a} {b}" for a, b in iv) + "\n"


ROOMS = dict(
    slug='meeting-rooms', title='Meeting Rooms Needed', difficulty='Medium', category='Greedy',
    tags=['greedy', 'sorting', 'heap', 'intervals'], points=25,
    statement=(
        "You are given n meetings. Meeting i runs from time s[i] up to, but not including, time e[i]. "
        "Two meetings that overlap need different rooms. A meeting that ends at time t does not overlap "
        "one that starts at time t.\n\n"
        "Find the smallest number of rooms that can host all meetings."
    ),
    input_format="Line 1: n.\nNext n lines: s and e for each meeting (s < e).",
    output_format="One integer, the minimum number of rooms.",
    constraints=["1 ≤ n ≤ 10 000", "0 ≤ s < e ≤ 10^9"],
    samples=[
        ("3\n0 30\n5 10\n15 20\n", "2\n", "The first meeting overlaps both others, which do not overlap each other."),
        ("2\n0 5\n5 10\n", "1\n", "Touching meetings can share a room."),
    ],
    hidden=rooms_tests, brute=rooms_brute, small=rooms_small,
    editorial=(
        "Sort meetings by start time and keep a min-heap of end times of rooms in use. "
        "For each meeting, if the earliest-ending room has end ≤ start, reuse it (pop) before pushing the new end. "
        "The heap size at the end is the answer. A sweep over sorted start and end times also works. O(n log n)."
    ),
    py='''import sys
d = sys.stdin.read().split()
n = int(d[0])
ev = []
for i in range(n):
    ev.append((int(d[1 + 2 * i]), 1))
    ev.append((int(d[2 + 2 * i]), -1))
ev.sort()
cur = best = 0
for _, k in ev:
    cur += k
    best = max(best, cur)
print(best)
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0];
const iv = [];
for (let i = 0; i < n; i++) iv.push([d[1 + 2 * i], d[2 + 2 * i]]);
iv.sort((a, b) => a[0] - b[0]);
const heap = [];
const push = (v) => { heap.push(v); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l] < heap[m]) m = l; if (r < heap.length && heap[r] < heap[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
for (const [s, e] of iv) {
  if (heap.length && heap[0] <= s) pop();
  push(e);
}
console.log(heap.length);
''',
)


# ------------------------------------------------------------------- 13 LIS
def lis_tests():
    r = rng(13)
    t = [
        "1\n5\n",
        "6\n10 9 2 5 3 7\n",
        "5\n1 2 3 4 5\n",
        "5\n5 4 3 2 1\n",
        "6\n3 3 3 3 3 3\n",
        "8\n0 8 4 12 2 10 6 14\n",
        "7\n-5 -4 -4 -3 -3 -2 -1\n",
    ]
    t.append(f"10000\n{line(ints(r, 10000, -10**6, 10**6))}\n")
    t.append(f"10000\n{line(range(10000))}\n")
    t.append(f"10000\n{line(range(10000, 0, -1))}\n")
    t.append(f"10000\n{line(ints(r, 10000, 0, 3))}\n")
    return t


def lis_brute(s):
    d = list(map(int, s.split()))
    n, a = d[0], d[1:1 + d[0]]
    dp = [1] * n
    for i in range(n):
        for j in range(i):
            if a[j] < a[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return str(max(dp))


def lis_small(r):
    n = r.randint(1, 10)
    return f"{n}\n{line(ints(r, n, -4, 4))}\n"


LIS = dict(
    slug='longest-increasing-subsequence', title='Longest Increasing Subsequence', difficulty='Medium',
    category='Dynamic Programming', tags=['dynamic-programming', 'binary-search'], points=25,
    statement=(
        "A subsequence keeps the original order but may skip elements. Find the length of the longest "
        "strictly increasing subsequence of the array (each element larger than the one before it)."
    ),
    input_format="Line 1: n.\nLine 2: n integers.",
    output_format="One integer, the length.",
    constraints=["1 ≤ n ≤ 10 000", "-10^6 ≤ a[i] ≤ 10^6"],
    samples=[
        ("6\n10 9 2 5 3 7\n", "3\n", "For example 2, 5, 7 or 2, 3, 7."),
        ("4\n4 4 4 4\n", "1\n", "Strictly increasing: equal values do not extend a subsequence."),
    ],
    hidden=lis_tests, brute=lis_brute, small=lis_small,
    editorial=(
        "The O(n²) DP (dp[i] = 1 + max dp[j] for j < i with a[j] < a[i]) is too slow at n = 10 000 in slower "
        "languages. Keep an array tails where tails[k] is the smallest possible last value of an increasing "
        "subsequence of length k + 1. For each x, binary search the first tails entry ≥ x and replace it with x "
        "(append if none). The final length of tails is the answer. Use lower bound so equal values do not extend. "
        "O(n log n)."
    ),
    py='''import sys
from bisect import bisect_left
d = sys.stdin.read().split()
n = int(d[0])
tails = []
for x in map(int, d[1:1 + n]):
    k = bisect_left(tails, x)
    if k == len(tails):
        tails.append(x)
    else:
        tails[k] = x
print(len(tails))
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0];
const tails = [];
for (let i = 1; i <= n; i++) {
  const x = d[i];
  let lo = 0, hi = tails.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
  tails[lo] = x;
}
console.log(tails.length);
''',
)


# ---------------------------------------------------- 14 grid shortest path
def maze_tests():
    r = rng(14)
    t = [
        grid_text(["."]),
        grid_text(["#"]),
        grid_text([".#", "#."]),
        grid_text(["..", ".."]),
        grid_text(["...", ".#.", "..."]),
        grid_text(["#..", "...", "..."]),
        grid_text(["...", "...", "..#"]),
        grid_text(["..........", "#########.", "..........", ".#########", ".........."]),
        grid_text(["." * 9, "." * 9]),
    ]
    for p in (0.25, 0.35):
        while True:
            rows = [''.join('#' if r.random() < p else '.' for _ in range(200)) for _ in range(200)]
            rows[0] = '.' + rows[0][1:]
            rows[-1] = rows[-1][:-1] + '.'
            t.append(grid_text(rows))
            break
    rows = [('.' * 200) if i % 2 == 0 else (('#' * 199 + '.') if (i // 2) % 2 == 0 else ('.' + '#' * 199)) for i in range(199)]
    t.append(grid_text(rows))
    return t


def maze_brute(s):
    d = s.split('\n')
    R, C = map(int, d[0].split())
    g = d[1:1 + R]
    if g[0][0] == '#' or g[R - 1][C - 1] == '#':
        return '-1'
    INF = 10**9
    dist = [[INF] * C for _ in range(R)]
    dist[0][0] = 0
    changed = True
    while changed:
        changed = False
        for i in range(R):
            for j in range(C):
                if g[i][j] == '#':
                    continue
                for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if 0 <= ni < R and 0 <= nj < C and g[ni][nj] == '.' and dist[ni][nj] + 1 < dist[i][j]:
                        dist[i][j] = dist[ni][nj] + 1
                        changed = True
    return str(dist[R - 1][C - 1] if dist[R - 1][C - 1] < INF else -1)


def maze_small(r):
    R, C = r.randint(1, 6), r.randint(1, 6)
    return grid_text([''.join(r.choice('..#') for _ in range(C)) for _ in range(R)])


MAZE = dict(
    slug='shortest-path-in-a-maze', title='Shortest Path in a Maze', difficulty='Medium', category='Graphs',
    tags=['graph', 'bfs', 'grid', 'shortest-path'], points=25,
    statement=(
        "A maze is a grid where . is an open cell and # is a wall. You start in the top-left cell and want to "
        "reach the bottom-right cell. In one step you move to an open cell above, below, left or right.\n\n"
        "Print the smallest number of steps, or -1 if the exit cannot be reached. If the start or the exit is "
        "a wall, the answer is -1. If the grid has one open cell, the answer is 0."
    ),
    input_format="Line 1: R and C.\nNext R lines: C characters each, . or #.",
    output_format="One integer: the minimum steps, or -1.",
    constraints=["1 ≤ R, C ≤ 200"],
    samples=[
        ("3 3\n...\n.#.\n...\n", "4\n", "Go around the wall: 4 steps."),
        ("2 2\n.#\n#.\n", "-1\n", "Both routes are blocked."),
    ],
    hidden=maze_tests, brute=maze_brute, small=maze_small,
    editorial=(
        "Every move costs 1, so breadth-first search from the start finds the shortest path. "
        "Keep a distance grid initialised to -1, push the start with distance 0, and expand neighbours "
        "that are open and unvisited. Check the start and exit cells first. O(R·C)."
    ),
    py='''import sys
from collections import deque
d = sys.stdin.read().split('\\n')
R, C = map(int, d[0].split())
g = [d[1 + i].strip() for i in range(R)]
if g[0][0] == '#' or g[R - 1][C - 1] == '#':
    print(-1)
else:
    dist = [[-1] * C for _ in range(R)]
    dist[0][0] = 0
    q = deque([(0, 0)])
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < R and 0 <= ny < C and g[nx][ny] == '.' and dist[nx][ny] < 0:
                dist[nx][ny] = dist[x][y] + 1
                q.append((nx, ny))
    print(dist[R - 1][C - 1])
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split('\\n');
const [R, C] = d[0].split(' ').map(Number);
const g = [];
for (let i = 0; i < R; i++) g.push(d[1 + i].trim());
if (g[0][0] === '#' || g[R - 1][C - 1] === '#') { console.log(-1); }
else {
  const seen = new Uint8Array(R * C);
  seen[0] = 1;
  let frontier = [0], steps = 0, answer = -1;
  if (R === 1 && C === 1) answer = 0;
  while (answer < 0 && frontier.length) {
    steps++;
    const next = [];
    for (const cell of frontier) {
      const x = (cell / C) | 0, y = cell % C;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= R || ny >= C || g[nx][ny] !== '.' || seen[nx * C + ny]) continue;
        seen[nx * C + ny] = 1;
        if (nx === R - 1 && ny === C - 1) answer = steps;
        next.push(nx * C + ny);
      }
    }
    frontier = next;
  }
  console.log(answer);
}
''',
)


# ------------------------------------------------------- 15 course schedule
def sched_text(n, edges):
    return f"{n} {len(edges)}\n" + ''.join(f"{a} {b}\n" for a, b in edges)


def sched_tests():
    r = rng(15)
    t = [
        sched_text(1, []),
        sched_text(1, [(1, 1)]),
        sched_text(2, [(1, 2)]),
        sched_text(2, [(1, 2), (2, 1)]),
        sched_text(4, [(1, 2), (2, 3), (3, 4)]),
        sched_text(4, [(1, 2), (2, 3), (3, 4), (4, 2)]),
        sched_text(5, [(1, 3), (2, 3), (3, 4), (3, 5), (1, 2)]),
        sched_text(3, [(1, 2), (1, 2), (2, 3)]),
        sched_text(6, [(1, 2), (3, 4), (5, 6), (6, 5)]),
    ]
    n = 10000
    perm = list(range(1, n + 1))
    r.shuffle(perm)
    dag = []
    for _ in range(20000):
        i, j = sorted(r.sample(range(n), 2))
        dag.append((perm[i], perm[j]))
    t.append(sched_text(n, dag))
    cyc = list(dag)
    cyc.append((perm[-1], perm[0]))
    chain = [(perm[i], perm[i + 1]) for i in range(n - 1)]
    t.append(sched_text(n, chain + [(perm[-1], perm[0])]))
    t.append(sched_text(n, chain))
    return t


def sched_brute(s):
    d = list(map(int, s.split()))
    n, m = d[0], d[1]
    reach = [[False] * n for _ in range(n)]
    for k in range(m):
        reach[d[2 + 2 * k] - 1][d[3 + 2 * k] - 1] = True
    for k in range(n):
        for i in range(n):
            if reach[i][k]:
                for j in range(n):
                    if reach[k][j]:
                        reach[i][j] = True
    return 'NO' if any(reach[i][i] for i in range(n)) else 'YES'


def sched_small(r):
    n = r.randint(1, 6)
    m = r.randint(0, 8)
    return sched_text(n, [(r.randint(1, n), r.randint(1, n)) for _ in range(m)])


SCHEDULE = dict(
    slug='course-schedule', title='Can You Finish All Courses?', difficulty='Medium', category='Graphs',
    tags=['graph', 'topological-sort', 'cycle-detection'], points=25,
    statement=(
        "There are n courses numbered 1 to n. Each requirement \"a b\" means course a must be completed "
        "before course b can be started. You take one course at a time.\n\n"
        "Decide whether it is possible to complete every course."
    ),
    input_format="Line 1: n and m.\nNext m lines: two integers a and b.",
    output_format="YES if all courses can be completed, otherwise NO.",
    constraints=["1 ≤ n ≤ 10 000", "0 ≤ m ≤ 20 000", "1 ≤ a, b ≤ n; duplicate requirements and a = b may occur"],
    samples=[
        ("4 3\n1 2\n2 3\n3 4\n", "YES\n", "Take 1, 2, 3, 4 in order."),
        ("2 2\n1 2\n2 1\n", "NO\n", "Each course waits for the other."),
    ],
    hidden=sched_tests, brute=sched_brute, small=sched_small,
    editorial=(
        "This is cycle detection in a directed graph. Kahn's algorithm: compute in-degrees, repeatedly take a "
        "course with in-degree 0, and lower the in-degree of its successors. If every course gets taken the answer "
        "is YES; if some are never freed, they sit on a cycle. A self-requirement a = a is a cycle of length 1. "
        "O(n + m)."
    ),
    py='''import sys
from collections import deque
d = sys.stdin.read().split()
n, m = int(d[0]), int(d[1])
adj = [[] for _ in range(n + 1)]
indeg = [0] * (n + 1)
for k in range(m):
    a, b = int(d[2 + 2 * k]), int(d[3 + 2 * k])
    adj[a].append(b)
    indeg[b] += 1
q = deque(i for i in range(1, n + 1) if indeg[i] == 0)
done = 0
while q:
    x = q.popleft()
    done += 1
    for y in adj[x]:
        indeg[y] -= 1
        if indeg[y] == 0:
            q.append(y)
print('YES' if done == n else 'NO')
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], m = d[1];
const adj = Array.from({ length: n + 1 }, () => []);
for (let k = 0; k < m; k++) adj[d[2 + 2 * k]].push(d[3 + 2 * k]);
const color = new Uint8Array(n + 1); // 0 new, 1 on stack, 2 done
let cyclic = false;
for (let s = 1; s <= n && !cyclic; s++) {
  if (color[s]) continue;
  const stack = [[s, 0]];
  color[s] = 1;
  while (stack.length && !cyclic) {
    const top = stack[stack.length - 1];
    const [u, i] = top;
    if (i < adj[u].length) {
      top[1]++;
      const v = adj[u][i];
      if (color[v] === 1) cyclic = true;
      else if (color[v] === 0) { color[v] = 1; stack.push([v, 0]); }
    } else { color[u] = 2; stack.pop(); }
  }
}
console.log(cyclic ? 'NO' : 'YES');
''',
)

MEDIUM = [MAX_SUBARRAY, LONGEST_UNIQUE, COIN_CHANGE, ISLANDS, ROOMS, LIS, MAZE, SCHEDULE]
