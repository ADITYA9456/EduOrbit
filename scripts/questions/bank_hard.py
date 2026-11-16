"""Hard problems (5). See bank_easy.py for the dict layout."""
from bank_easy import rng, ints, line


# ----------------------------------------------------------- 16 edit distance
def ed_tests():
    r = rng(16)
    t = [
        "\n\n",
        "\nabc\n",
        "abc\n\n",
        "kitten\nsitting\n",
        "intention\nexecution\n",
        "same\nsame\n",
        "abc\nxyz\n",
        "a\nb\n",
        "horse\nros\n",
        "sunday\nsaturday\n",
    ]
    for la, lb in ((60, 55), (900, 950)):
        a = ''.join(r.choice('abcd') for _ in range(la))
        b = ''.join(r.choice('abcd') for _ in range(lb))
        t.append(a + "\n" + b + "\n")
    base = ''.join(r.choice('abcdefgh') for _ in range(900))
    mutated = list(base)
    for _ in range(40):
        mutated[r.randrange(len(mutated))] = r.choice('xyz')
    t.append(base + "\n" + ''.join(mutated) + "\n")
    return t


def ed_brute(s):
    a, b = (s.split('\n') + ['', ''])[:2]
    from functools import lru_cache
    import sys
    sys.setrecursionlimit(10000)

    @lru_cache(None)
    def f(i, j):
        if i == len(a):
            return len(b) - j
        if j == len(b):
            return len(a) - i
        if a[i] == b[j]:
            return f(i + 1, j + 1)
        return 1 + min(f(i + 1, j), f(i, j + 1), f(i + 1, j + 1))

    return str(f(0, 0))


def ed_small(r):
    return ''.join(r.choice('abc') for _ in range(r.randint(0, 7))) + "\n" + ''.join(r.choice('abc') for _ in range(r.randint(0, 7))) + "\n"


EDIT_DISTANCE = dict(
    slug='edit-distance', title='Edit Distance', difficulty='Hard', category='Dynamic Programming',
    tags=['dynamic-programming', 'string'], points=50,
    statement=(
        "The edit distance between two strings is the smallest number of single-character operations "
        "needed to turn the first into the second. The operations are: insert a character, delete a character, "
        "replace a character with another.\n\n"
        "Compute the edit distance between strings s and t. Either string can be empty."
    ),
    input_format="Line 1: string s.\nLine 2: string t.\nBoth lines may be empty.",
    output_format="One integer, the edit distance.",
    constraints=["0 ≤ |s|, |t| ≤ 1 000", "Lowercase English letters"],
    samples=[
        ("horse\nros\n", "3\n", "horse → rorse (replace h) → rose (delete r) → ros (delete e)."),
        ("kitten\nsitting\n", "3\n", "Replace k, replace e, insert g."),
    ],
    hidden=ed_tests, brute=ed_brute, small=ed_small,
    editorial=(
        "Let d[i][j] be the distance between the first i characters of s and the first j of t. "
        "d[i][0] = i and d[0][j] = j. If s[i-1] = t[j-1] then d[i][j] = d[i-1][j-1]; otherwise "
        "d[i][j] = 1 + min(d[i-1][j], d[i][j-1], d[i-1][j-1]) for delete, insert and replace. "
        "Only the previous row is needed, so memory is O(|t|). Time O(|s|·|t|)."
    ),
    py='''import sys
parts = (sys.stdin.read().split('\\n') + ['', ''])[:2]
s, t = parts[0].strip(), parts[1].strip()
prev = list(range(len(t) + 1))
for i in range(1, len(s) + 1):
    cur = [i] + [0] * len(t)
    for j in range(1, len(t) + 1):
        if s[i - 1] == t[j - 1]:
            cur[j] = prev[j - 1]
        else:
            cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
    prev = cur
print(prev[len(t)])
''',
    js='''const parts = require('fs').readFileSync(0, 'utf8').split('\\n');
const s = (parts[0] || '').trim(), t = (parts[1] || '').trim();
const d = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
for (let i = 0; i <= s.length; i++) d[i][0] = i;
for (let j = 0; j <= t.length; j++) d[0][j] = j;
for (let i = 1; i <= s.length; i++) {
  for (let j = 1; j <= t.length; j++) {
    const cost = s[i - 1] === t[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
  }
}
console.log(d[s.length][t.length]);
''',
)


# ------------------------------------------------------------ 17 dijkstra
def dj_text(n, edges):
    return f"{n} {len(edges)}\n" + ''.join(f"{u} {v} {w}\n" for u, v, w in edges)


def dj_tests():
    r = rng(17)
    t = [
        dj_text(1, []),
        dj_text(3, [(1, 2, 5)]),
        dj_text(4, [(1, 2, 1), (2, 3, 1), (1, 3, 5), (3, 4, 1)]),
        dj_text(3, [(1, 2, 4), (1, 2, 2), (2, 2, 1), (2, 3, 7)]),
        dj_text(5, [(1, 2, 10**9), (2, 3, 10**9), (3, 4, 10**9), (4, 5, 10**9)]),
        dj_text(6, [(2, 3, 1), (3, 4, 1), (5, 6, 1)]),
        dj_text(2, [(1, 2, 1), (1, 2, 1)]),
    ]
    n = 4000
    edges = [(i, i + 1, r.randint(1, 10**9)) for i in range(1, n)]
    for _ in range(10000 - len(edges)):
        edges.append((r.randint(1, n), r.randint(1, n), r.randint(1, 10**9)))
    r.shuffle(edges)
    t.append(dj_text(n, edges))
    edges2 = [(r.randint(1, n), r.randint(1, n), r.randint(1, 100)) for _ in range(5000)]
    t.append(dj_text(n, edges2))
    return t


def dj_brute(s):
    d = list(map(int, s.split()))
    n, m = d[0], d[1]
    E = [(d[2 + 3 * k], d[3 + 3 * k], d[4 + 3 * k]) for k in range(m)]
    INF = float('inf')
    dist = [INF] * (n + 1)
    dist[1] = 0
    for _ in range(n):
        ch = False
        for u, v, w in E:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                ch = True
            if dist[v] + w < dist[u]:
                dist[u] = dist[v] + w
                ch = True
        if not ch:
            break
    return ' '.join(str(-1 if x == INF else x) for x in dist[1:])


def dj_small(r):
    n = r.randint(1, 7)
    m = r.randint(0, 10)
    return dj_text(n, [(r.randint(1, n), r.randint(1, n), r.randint(1, 9)) for _ in range(m)])


DIJKSTRA = dict(
    slug='shortest-distances', title='Shortest Distances from Node 1', difficulty='Hard', category='Graphs',
    tags=['graph', 'dijkstra', 'heap', 'shortest-path'], points=50,
    statement=(
        "An undirected, weighted graph has n nodes numbered 1 to n. Find the length of the shortest path "
        "from node 1 to every node.\n\n"
        "For a node that cannot be reached, print -1. The graph may contain parallel edges and self-loops."
    ),
    input_format="Line 1: n and m.\nNext m lines: u, v, w describing an undirected edge of weight w.",
    output_format="One line with n integers: the distance from node 1 to nodes 1, 2, …, n.",
    constraints=["1 ≤ n ≤ 4 000", "0 ≤ m ≤ 10 000", "1 ≤ w ≤ 10^9 (path lengths can exceed 32-bit integers)"],
    samples=[
        ("4 4\n1 2 1\n2 3 1\n1 3 5\n3 4 1\n", "0 1 2 3\n", "The route 1-2-3 costs 2, cheaper than the direct edge of 5."),
        ("3 1\n1 2 5\n", "0 5 -1\n", "Node 3 is not connected to node 1."),
    ],
    hidden=dj_tests, brute=dj_brute, small=dj_small,
    editorial=(
        "All weights are positive, so Dijkstra's algorithm applies. Keep a min-heap of (distance, node). "
        "Pop the closest node; skip it if the popped distance is stale. Relax each neighbour. "
        "Use 64-bit integers (long in Java, long long in C++): sums reach 10^13. "
        "With a heap the cost is O((n + m) log n)."
    ),
    py='''import sys, heapq
d = sys.stdin.read().split()
n, m = int(d[0]), int(d[1])
adj = [[] for _ in range(n + 1)]
for k in range(m):
    u, v, w = int(d[2 + 3 * k]), int(d[3 + 3 * k]), int(d[4 + 3 * k])
    adj[u].append((v, w))
    adj[v].append((u, w))
INF = float('inf')
dist = [INF] * (n + 1)
dist[1] = 0
h = [(0, 1)]
while h:
    du, u = heapq.heappop(h)
    if du > dist[u]:
        continue
    for v, w in adj[u]:
        nd = du + w
        if nd < dist[v]:
            dist[v] = nd
            heapq.heappush(h, (nd, v))
print(' '.join(str(-1 if x == INF else x) for x in dist[1:]))
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], m = d[1];
const adj = Array.from({ length: n + 1 }, () => []);
for (let k = 0; k < m; k++) {
  const u = d[2 + 3 * k], v = d[3 + 3 * k], w = d[4 + 3 * k];
  adj[u].push([v, w]); adj[v].push([u, w]);
}
const dist = new Array(n + 1).fill(Infinity);
const done = new Uint8Array(n + 1);
dist[1] = 0;
const heap = [[0, 1]];
const less = (a, b) => a[0] < b[0];
const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, s = i; if (l < heap.length && less(heap[l], heap[s])) s = l; if (r < heap.length && less(heap[r], heap[s])) s = r; if (s === i) break; [heap[i], heap[s]] = [heap[s], heap[i]]; i = s; } } return top; };
while (heap.length) {
  const [du, u] = pop();
  if (done[u]) continue;
  done[u] = 1;
  for (const [v, w] of adj[u]) {
    if (du + w < dist[v]) { dist[v] = du + w; push([dist[v], v]); }
  }
}
console.log(dist.slice(1).map((x) => (x === Infinity ? -1 : x)).join(' '));
''',
)


# ------------------------------------------------- 18 sliding window maximum
def sw_tests():
    r = rng(18)
    t = [
        "1 1\n5\n",
        "5 1\n3 1 4 1 5\n",
        "5 5\n3 1 4 1 5\n",
        "8 3\n1 3 -1 -3 5 3 6 7\n",
        "6 2\n6 5 4 3 2 1\n",
        "6 2\n1 2 3 4 5 6\n",
        "5 3\n-9 -9 -9 -9 -9\n",
        "7 4\n2 2 9 2 2 2 2\n",
    ]
    for n, k in ((200, 7), (10000, 100), (10000, 5000), (10000, 2)):
        t.append(f"{n} {k}\n{line(ints(r, n, -10**6, 10**6))}\n")
    return t


def sw_brute(s):
    d = list(map(int, s.split()))
    n, k = d[0], d[1]
    a = d[2:2 + n]
    return ' '.join(str(max(a[i:i + k])) for i in range(n - k + 1))


def sw_small(r):
    n = r.randint(1, 10)
    return f"{n} {r.randint(1, n)}\n{line(ints(r, n, -5, 5))}\n"


SLIDING = dict(
    slug='sliding-window-maximum', title='Sliding Window Maximum', difficulty='Hard', category='Queues',
    tags=['deque', 'sliding-window', 'monotonic-queue'], points=50,
    statement=(
        "A window of size k slides from the left end of the array to the right end, one position at a time. "
        "For every position of the window, report the largest value inside it."
    ),
    input_format="Line 1: n and k.\nLine 2: n integers.",
    output_format="n - k + 1 integers separated by spaces: the maximum of each window, left to right.",
    constraints=["1 ≤ k ≤ n ≤ 10 000", "-10^6 ≤ a[i] ≤ 10^6"],
    samples=[
        ("8 3\n1 3 -1 -3 5 3 6 7\n", "3 3 5 5 6 7\n", "Windows: [1 3 -1] [3 -1 -3] [-1 -3 5] [-3 5 3] [5 3 6] [3 6 7]."),
        ("4 4\n2 9 1 4\n", "9\n", "One window covering the whole array."),
    ],
    hidden=sw_tests, brute=sw_brute, small=sw_small,
    editorial=(
        "Taking the max of every window costs O(n·k). Use a monotonic deque of indices whose values are in "
        "decreasing order. For each new element, pop smaller values from the back, push the index, drop the front "
        "if it left the window, and the front is the window maximum. Each index enters and leaves once: O(n)."
    ),
    py='''import sys
from collections import deque
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
dq = deque()
out = []
for i, x in enumerate(a):
    while dq and a[dq[-1]] <= x:
        dq.pop()
    dq.append(i)
    if dq[0] <= i - k:
        dq.popleft()
    if i >= k - 1:
        out.append(a[dq[0]])
print(' '.join(map(str, out)))
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], k = d[1], a = d.slice(2, 2 + n);
const g = new Array(n), h = new Array(n);
for (let i = 0; i < n; i++) g[i] = i % k === 0 ? a[i] : Math.max(g[i - 1], a[i]);
for (let i = n - 1; i >= 0; i--) h[i] = i === n - 1 || (i + 1) % k === 0 ? a[i] : Math.max(h[i + 1], a[i]);
const out = [];
for (let i = 0; i + k <= n; i++) out.push(Math.max(h[i], g[i + k - 1]));
console.log(out.join(' '));
''',
)


# ------------------------------------------------ 19 largest rectangle
def hist_tests():
    r = rng(19)
    t = [
        "1\n0\n",
        "1\n9\n",
        "6\n2 1 5 6 2 3\n",
        "2\n2 4\n",
        "5\n3 3 3 3 3\n",
        "5\n1 2 3 4 5\n",
        "5\n5 4 3 2 1\n",
        "7\n0 0 5 0 0 5 5\n",
        "4\n1000000000 1000000000 1000000000 1000000000\n",
    ]
    t.append(f"10000\n{line(ints(r, 10000, 0, 100000))}\n")
    t.append(f"10000\n{line([7] * 10000)}\n")
    t.append(f"10000\n{line(range(1, 30001))}\n")
    return t


def hist_brute(s):
    d = list(map(int, s.split()))
    n, h = d[0], d[1:1 + d[0]]
    best = 0
    for i in range(n):
        lo = hi = h[i]
        for j in range(i, n):
            lo = min(lo, h[j])
            best = max(best, lo * (j - i + 1))
    return str(best)


def hist_small(r):
    n = r.randint(1, 9)
    return f"{n}\n{line(ints(r, n, 0, 6))}\n"


HISTOGRAM = dict(
    slug='largest-rectangle-in-histogram', title='Largest Rectangle in a Histogram', difficulty='Hard',
    category='Stacks', tags=['stack', 'monotonic-stack', 'array'], points=50,
    statement=(
        "A histogram has n bars of width 1. Bar i has height h[i]. Find the area of the largest rectangle "
        "that fits entirely inside the histogram, with its sides along the bars."
    ),
    input_format="Line 1: n.\nLine 2: n integers h[0] … h[n-1].",
    output_format="One integer, the maximum area.",
    constraints=["1 ≤ n ≤ 10 000", "0 ≤ h[i] ≤ 10^9 (the area can exceed 32 bits)"],
    samples=[
        ("6\n2 1 5 6 2 3\n", "10\n", "Bars 5 and 6 give a rectangle of width 2 and height 5."),
        ("3\n4 4 4\n", "12\n", "The whole histogram: 3 × 4."),
    ],
    hidden=hist_tests, brute=hist_brute, small=hist_small,
    editorial=(
        "For each bar, the best rectangle that uses its full height extends left and right until a shorter bar. "
        "A monotonic stack finds the nearest shorter bar on each side in one pass: keep indices of increasing "
        "heights; when a shorter bar arrives, pop and compute the area for the popped bar. "
        "A sentinel height 0 at the end flushes the stack. O(n). Use 64-bit integers for the area."
    ),
    py='''import sys
d = sys.stdin.read().split()
n = int(d[0])
h = list(map(int, d[1:1 + n])) + [0]
st = []
best = 0
for i, x in enumerate(h):
    while st and h[st[-1]] >= x:
        height = h[st.pop()]
        left = st[-1] + 1 if st else 0
        best = max(best, height * (i - left))
    st.append(i)
print(best)
''',
    js='''const d = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const n = d[0], h = d.slice(1, 1 + n);
const L = new Array(n), R = new Array(n);
let st = [];
for (let i = 0; i < n; i++) { while (st.length && h[st[st.length - 1]] >= h[i]) st.pop(); L[i] = st.length ? st[st.length - 1] : -1; st.push(i); }
st = [];
for (let i = n - 1; i >= 0; i--) { while (st.length && h[st[st.length - 1]] >= h[i]) st.pop(); R[i] = st.length ? st[st.length - 1] : n; st.push(i); }
let best = 0;
for (let i = 0; i < n; i++) best = Math.max(best, h[i] * (R[i] - L[i] - 1));
console.log(String(best));
''',
)


# ----------------------------------------------- 20 minimum window substring
def mw_tests():
    r = rng(20)
    t = [
        "adobecodebanc\nabc\n",
        "a\na\n",
        "a\nb\n",
        "a\naa\n",
        "aa\naa\n",
        "abc\nabcd\n",
        "bba\nab\n",
        "xyzzyx\nzz\n",
        "aaflslflsldkalskaaa\naaa\n",
        "abcabdebac\ncda\n",
    ]
    s = ''.join(r.choice('abcdefghij') for _ in range(10000))
    t.append(s + "\nabcdefghij\n")
    t.append(s + "\naabbccddeeffgghhiijjkk\n")
    t.append(s + "\n" + ''.join(r.choice('abc') for _ in range(6)) + "\n")
    return t


def mw_brute(s):
    a, b = s.split('\n')[:2]
    from collections import Counter
    need = Counter(b)
    for size in range(len(b), len(a) + 1):
        for st in range(len(a) - size + 1):
            w = Counter(a[st:st + size])
            if all(w[c] >= k for c, k in need.items()):
                return a[st:st + size]
    return '-1'


def mw_small(r):
    return ''.join(r.choice('abc') for _ in range(r.randint(1, 10))) + "\n" + ''.join(r.choice('abc') for _ in range(r.randint(1, 4))) + "\n"


MIN_WINDOW = dict(
    slug='minimum-window-substring', title='Minimum Window Substring', difficulty='Hard', category='Strings',
    tags=['string', 'sliding-window', 'hash-map', 'two-pointers'], points=50,
    statement=(
        "Given strings s and t, find the shortest substring of s that contains every character of t, "
        "counting repeats (if t has two a's, the window needs at least two a's).\n\n"
        "If several windows have the minimum length, print the one that starts earliest. "
        "If no window exists, print -1."
    ),
    input_format="Line 1: string s.\nLine 2: string t.",
    output_format="The window itself, or -1.",
    constraints=["1 ≤ |s|, |t| ≤ 10 000", "Lowercase English letters"],
    samples=[
        ("adobecodebanc\nabc\n", "banc\n", "banc is the shortest window containing a, b and c."),
        ("a\naa\n", "-1\n", "s has only one a."),
    ],
    hidden=mw_tests, brute=mw_brute, small=mw_small,
    editorial=(
        "Count the characters needed from t. Expand the right edge, decreasing a counter 'missing' whenever "
        "a needed character is covered. When missing reaches 0, shrink the left edge as far as possible while "
        "the window stays valid, and record it if it is strictly shorter than the best so far (strict comparison "
        "keeps the earliest window on ties). Each pointer moves at most |s| times: O(|s| + |t|)."
    ),
    py='''import sys
from collections import Counter
parts = sys.stdin.read().split('\\n')
s, t = parts[0].strip(), parts[1].strip()
need = Counter(t)
missing = len(t)
left = 0
best = (0, 10**9)
for right, c in enumerate(s):
    if need[c] > 0:
        missing -= 1
    need[c] -= 1
    if missing == 0:
        while need[s[left]] < 0:
            need[s[left]] += 1
            left += 1
        if right - left < best[1] - best[0]:
            best = (left, right)
        need[s[left]] += 1
        missing += 1
        left += 1
print(-1 if best[1] == 10**9 else s[best[0]:best[1] + 1])
''',
    js='''const parts = require('fs').readFileSync(0, 'utf8').split('\\n');
const s = parts[0].trim(), t = parts[1].trim();
const need = {};
for (const c of t) need[c] = (need[c] || 0) + 1;
const have = {};
let satisfied = 0;
const distinct = Object.keys(need).length;
let bestLen = Infinity, bestStart = 0, left = 0;
for (let right = 0; right < s.length; right++) {
  const c = s[right];
  have[c] = (have[c] || 0) + 1;
  if (need[c] && have[c] === need[c]) satisfied++;
  while (satisfied === distinct) {
    if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
    const lc = s[left];
    have[lc]--;
    if (need[lc] && have[lc] < need[lc]) satisfied--;
    left++;
  }
}
console.log(bestLen === Infinity ? '-1' : s.substr(bestStart, bestLen));
''',
)

HARD = [EDIT_DISTANCE, DIJKSTRA, SLIDING, HISTOGRAM, MIN_WINDOW]
