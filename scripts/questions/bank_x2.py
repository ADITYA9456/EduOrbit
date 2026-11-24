"""Extended bank, part 2: 16 medium problems (arrays, strings, binary search, DP, graphs, stacks)."""
from qlib import ints, line, prob, rng

X2 = []
MOD = 10**9 + 7


# ------------------------------------------------------------ product except self
def solve(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    pre = [1] * (n + 1)
    for i in range(n):
        pre[i + 1] = pre[i] * a[i] % (10**9 + 7)
    suf, out = 1, [0] * n
    for i in range(n - 1, -1, -1):
        out[i] = pre[i] * suf % (10**9 + 7)
        suf = suf * a[i] % (10**9 + 7)
    return ' '.join(map(str, out))


def brute(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    out = []
    for i in range(n):
        p = 1
        for j in range(n):
            if j != i:
                p *= a[j]
        out.append(p % (10**9 + 7))
    return ' '.join(map(str, out))


def small(r):
    n = r.randint(2, 7)
    return f"{n}\n{line(ints(r, n, -4, 4))}\n"


def tests():
    r = rng(31)
    return ["2\n3 4\n", "3\n0 0 5\n", "4\n1 2 3 4\n", "3\n-1 -1 -1\n", "5\n0 2 3 4 5\n",
            f"100000\n{line(ints(r, 100000, -10**9, 10**9))}\n", f"100000\n{line(ints(r, 100000, 1, 3))}\n"]


X2.append(prob(
    'product-except-self', 'Product of the Others', 'Medium', 'Arrays', ['array', 'prefix-product'], 20,
    "For every position i, compute the product of all the other elements of the array. Print each product modulo 1 000 000 007 as a non-negative number (between 0 and 1 000 000 006).",
    "Line 1: n.\nLine 2: n integers.", "n integers: the product of everything except a[i], modulo 1 000 000 007.",
    ["2 ≤ n ≤ 100 000", "-10^9 ≤ a[i] ≤ 10^9"],
    [("4\n1 2 3 4\n", "24 12 8 6\n", "For i = 0 the product is 2·3·4 = 24."), ("3\n0 0 5\n", "0 0 0\n", "Every product leaves out only one of the two zeros.")],
    tests,
    "Dividing the full product by a[i] breaks when a[i] is 0 (and modular division needs an inverse). Instead keep prefix products and suffix products: the answer for i is prefix[i] · suffix[i+1], taken modulo 1 000 000 007. O(n), no division.",
    solve, brute, small))


# ------------------------------------------------------------ kth largest
def solve(text):
    import heapq
    d = text.split()
    n, k = int(d[0]), int(d[1])
    h = []
    for x in map(int, d[2:2 + n]):
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:
            heapq.heapreplace(h, x)
    return h[0]


def brute(text):
    d = text.split()
    n, k = int(d[0]), int(d[1])
    return sorted(map(int, d[2:2 + n]), reverse=True)[k - 1]


def small(r):
    n = r.randint(1, 9)
    return f"{n} {r.randint(1, n)}\n{line(ints(r, n, -5, 5))}\n"


def tests():
    r = rng(32)
    return ["1 1\n5\n", "3 3\n1 2 3\n", "5 2\n4 4 4 4 4\n", "6 1\n-1 -2 -3 -4 -5 -6\n",
            f"100000 50000\n{line(ints(r, 100000, -10**9, 10**9))}\n", f"100000 100000\n{line(ints(r, 100000, 0, 20))}\n"]


X2.append(prob(
    'kth-largest', 'K-th Largest Element', 'Medium', 'Arrays', ['array', 'heap', 'sorting'], 20,
    "Sort the array from largest to smallest (equal values count separately) and print the element at position k (1-based).",
    "Line 1: n and k.\nLine 2: n integers.", "The k-th largest element.",
    ["1 ≤ k ≤ n ≤ 100 000", "-10^9 ≤ a[i] ≤ 10^9"],
    [("5 2\n3 2 1 5 6\n", "5\n", "Descending: 6 5 3 2 1; the 2nd is 5."), ("6 4\n3 2 3 1 2 4\n", "2\n", "Descending: 4 3 3 2 2 1; the 4th is 2.")],
    tests,
    "Sorting works in O(n log n). A min-heap that keeps only the k largest values seen so far does it in O(n log k): its smallest element is the answer at the end.",
    solve, brute, small))


# ------------------------------------------------------------ merge intervals
def solve(text):
    d = text.split()
    n = int(d[0])
    iv = sorted((int(d[1 + 2 * i]), int(d[2 + 2 * i])) for i in range(n))
    out = [list(iv[0])]
    for l, r in iv[1:]:
        if l <= out[-1][1]:
            out[-1][1] = max(out[-1][1], r)
        else:
            out.append([l, r])
    return f"{len(out)}\n" + '\n'.join(f"{l} {r}" for l, r in out)


def brute(text):
    d = text.split()
    n = int(d[0])
    iv = [[int(d[1 + 2 * i]), int(d[2 + 2 * i])] for i in range(n)]
    changed = True
    while changed:
        changed = False
        for i in range(len(iv)):
            for j in range(i + 1, len(iv)):
                if iv[i][0] <= iv[j][1] and iv[j][0] <= iv[i][1]:
                    iv[i] = [min(iv[i][0], iv[j][0]), max(iv[i][1], iv[j][1])]
                    iv.pop(j)
                    changed = True
                    break
            if changed:
                break
    iv.sort()
    return f"{len(iv)}\n" + '\n'.join(f"{l} {r}" for l, r in iv)


def small(r):
    n = r.randint(1, 6)
    rows = []
    for _ in range(n):
        a = r.randint(0, 12)
        rows.append(f"{a} {a + r.randint(0, 4)}")
    return f"{n}\n" + '\n'.join(rows) + '\n'


def tests():
    r = rng(33)
    big = []
    for _ in range(50000):
        a = r.randint(0, 10**9 - 10)
        big.append(f"{a} {a + r.randint(0, 5)}")
    chain = '\n'.join(f"{i * 2} {i * 2 + 2}" for i in range(50000))
    return ["1\n1 1\n", "2\n1 2\n3 4\n", "2\n1 2\n2 3\n", "3\n1 10\n2 3\n4 5\n", "3\n5 6\n1 2\n3 4\n", f"50000\n" + '\n'.join(big) + '\n', f"50000\n{chain}\n"]


X2.append(prob(
    'merge-intervals', 'Merge the Intervals', 'Medium', 'Arrays', ['array', 'sorting', 'intervals'], 20,
    "Each interval [l, r] covers the integers from l to r inclusive. Two intervals should be merged when they overlap or share an endpoint, "
    "for example [1, 2] and [2, 3] become [1, 3], but [1, 2] and [3, 4] stay separate. Merge all intervals and print the result sorted by start.",
    "Line 1: n.\nNext n lines: l and r.", "Line 1: the number m of merged intervals.\nNext m lines: l and r of each merged interval, in increasing order.",
    ["1 ≤ n ≤ 50 000", "0 ≤ l ≤ r ≤ 10^9"],
    [("4\n1 3\n2 6\n8 10\n15 18\n", "3\n1 6\n8 10\n15 18\n", "[1,3] and [2,6] overlap and become [1,6]."),
     ("2\n1 4\n4 5\n", "1\n1 5\n", "They touch at 4, so they merge.")],
    tests,
    "Sort the intervals by start. Keep the last merged interval; if the next one starts at or before its end, extend the end to the larger of the two, otherwise start a new interval. O(n log n).",
    solve, brute, small))


# ------------------------------------------------------------ subarray sum equals k
def solve(text):
    d = text.split()
    n, k = int(d[0]), int(d[1])
    seen = {0: 1}
    s = ans = 0
    for x in map(int, d[2:2 + n]):
        s += x
        ans += seen.get(s - k, 0)
        seen[s] = seen.get(s, 0) + 1
    return ans


def brute(text):
    d = text.split()
    n, k = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    return sum(1 for i in range(n) for j in range(i, n) if sum(a[i:j + 1]) == k)


def small(r):
    n = r.randint(1, 9)
    return f"{n} {r.randint(-4, 4)}\n{line(ints(r, n, -3, 3))}\n"


def tests():
    r = rng(34)
    return ["1 0\n0\n", "3 0\n0 0 0\n", "4 5\n1 2 3 -1\n", "3 100\n1 2 3\n", "5 3\n1 1 1 1 1\n",
            f"200000 0\n{line(ints(r, 200000, -3, 3))}\n", f"200000 10\n{line(ints(r, 200000, -10**4, 10**4))}\n", f"100000 0\n{line([0] * 100000)}\n"]


X2.append(prob(
    'subarray-sum-k', 'Subarrays with Sum K', 'Medium', 'Arrays', ['array', 'prefix-sum', 'hash-map'], 20,
    "Count the contiguous, non-empty subarrays whose elements add up to exactly k. Values may be negative.",
    "Line 1: n and k.\nLine 2: n integers.", "The number of subarrays with sum k.",
    ["1 ≤ n ≤ 200 000", "-10^4 ≤ a[i] ≤ 10^4", "-10^9 ≤ k ≤ 10^9", "The answer fits in a signed 64-bit integer"],
    [("3 2\n1 1 1\n", "2\n", "[1,1] at positions 0-1 and at positions 1-2."), ("4 0\n1 -1 1 -1\n", "4\n", "[1,-1] twice, [-1,1] once, and the whole array.")],
    tests,
    "Let P[i] be the prefix sum up to i. A subarray (j, i] sums to k exactly when P[i] - P[j] = k. Walk left to right, and for each prefix count how many earlier prefixes equal P[i] - k using a hash map (with prefix 0 pre-seeded). Sliding windows fail here because of negative numbers. O(n).",
    solve, brute, small))


# ------------------------------------------------------------ anagram groups
def solve(text):
    from collections import Counter
    d = text.split()
    n = int(d[0])
    c = Counter(''.join(sorted(w)) for w in d[1:1 + n])
    return f"{len(c)} {max(c.values())}"


def brute(text):
    d = text.split()
    n = int(d[0])
    words = d[1:1 + n]
    group = list(range(n))
    for i in range(n):
        for j in range(i + 1, n):
            if sorted(words[i]) == sorted(words[j]):
                old, new = group[j], group[i]
                group = [new if g == old else g for g in group]
    sizes = {}
    for g in group:
        sizes[g] = sizes.get(g, 0) + 1
    return f"{len(sizes)} {max(sizes.values())}"


def small(r):
    n = r.randint(1, 7)
    return f"{n}\n" + '\n'.join(''.join(r.choice('abc') for _ in range(r.randint(1, 3))) for _ in range(n)) + '\n'


def tests():
    r = rng(35)
    big = [''.join(r.choice('abcde') for _ in range(6)) for _ in range(20000)]
    return ["1\nabc\n", "3\nabc\nbca\ncab\n", "3\nabc\nabd\nabe\n", "4\neat\ntea\ntan\nate\n", f"20000\n" + '\n'.join(big) + '\n']


X2.append(prob(
    'anagram-groups', 'Anagram Groups', 'Medium', 'Strings', ['string', 'hash-map', 'sorting'], 20,
    "Put words into the same group when they are anagrams of each other. Print how many groups there are and the size of the largest group.",
    "Line 1: n.\nNext n lines: one lowercase word each.", "Two integers: the number of groups and the size of the largest group.",
    ["1 ≤ n ≤ 20 000", "1 ≤ word length ≤ 10", "Total length ≤ 200 000"],
    [("6\neat\ntea\ntan\nate\nnat\nbat\n", "3 3\n", "Groups: {eat, tea, ate}, {tan, nat}, {bat}."), ("2\nab\ncd\n", "2 1\n", "Two groups of one word.")],
    tests,
    "Anagrams become identical when their letters are sorted, so use the sorted word as a dictionary key and count how many words share each key. O(total length · log word length).",
    solve, brute, small))


# ------------------------------------------------------------ lower bound queries
def solve(text):
    from bisect import bisect_left
    d = text.split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    return '\n'.join(str(bisect_left(a, x)) for x in map(int, d[2 + n:2 + n + q]))


def brute(text):
    d = text.split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    out = []
    for x in map(int, d[2 + n:2 + n + q]):
        i = 0
        while i < n and a[i] < x:
            i += 1
        out.append(i)
    return '\n'.join(map(str, out))


def small(r):
    n, q = r.randint(1, 8), r.randint(1, 5)
    a = sorted(ints(r, n, -6, 6))
    return f"{n} {q}\n{line(a)}\n{line(ints(r, q, -8, 8))}\n"


def tests():
    r = rng(36)
    a = sorted(ints(r, 100000, -10**9, 10**9))
    return ["1 1\n5\n5\n", "1 2\n5\n4 6\n", "3 3\n2 2 2\n1 2 3\n", f"100000 100000\n{line(a)}\n{line(ints(r, 100000, -10**9, 10**9))}\n",
            f"100000 5\n{line(sorted(ints(r, 100000, 0, 5)))}\n0 1 2 5 6\n"]


X2.append(prob(
    'lower-bound-queries', 'First Position Not Smaller', 'Medium', 'Binary Search', ['binary-search', 'array'], 20,
    "An array is sorted in non-decreasing order. For each query x, print the smallest position i such that a[i] ≥ x, or n if every element is smaller than x.",
    "Line 1: n and q.\nLine 2: the n sorted integers.\nLine 3: q query values.", "q lines, one answer per query.",
    ["1 ≤ n, q ≤ 100 000", "-10^9 ≤ a[i], x ≤ 10^9"],
    [("5 3\n1 3 3 5 8\n3 4 9\n", "1\n3\n5\n", "3 first appears at 1; 4 would sit before 5 at position 3; 9 is larger than everything so the answer is n = 5.")],
    tests,
    "Binary search for the boundary between 'a[i] < x' and 'a[i] ≥ x': keep lo and hi, test the middle, and move one end each step. O(log n) per query, which is O((n + q) log n) overall instead of O(n·q) for a linear scan.",
    solve, brute, small))


# ------------------------------------------------------------ longest substring with at most k distinct
def solve(text):
    d = text.split()
    k, s = int(d[0]), d[1]
    cnt, lo, best = {}, 0, 0
    for hi, ch in enumerate(s):
        cnt[ch] = cnt.get(ch, 0) + 1
        while len(cnt) > k:
            cnt[s[lo]] -= 1
            if cnt[s[lo]] == 0:
                del cnt[s[lo]]
            lo += 1
        best = max(best, hi - lo + 1)
    return best


def brute(text):
    d = text.split()
    k, s = int(d[0]), d[1]
    n = len(s)
    return max(j - i for i in range(n) for j in range(i + 1, n + 1) if len(set(s[i:j])) <= k)


def small(r):
    s = ''.join(r.choice('abcd') for _ in range(r.randint(1, 10)))
    return f"{r.randint(1, 4)}\n{s}\n"


def tests():
    r = rng(37)
    return ["1\na\n", "1\naaaa\n", "2\neceba\n", "3\naabacbebebe\n", "5\nabc\n", f"3\n{''.join(r.choice('abcdefgh') for _ in range(100000))}\n",
            f"1\n{'a' * 50000 + 'b' * 50000}\n"]


X2.append(prob(
    'longest-k-distinct', 'Longest Substring with K Distinct Letters', 'Medium', 'Strings', ['string', 'sliding-window'], 20,
    "Find the length of the longest substring (a contiguous piece) of a string that contains at most k different letters.",
    "Line 1: k.\nLine 2: the string.", "The maximum length.",
    ["1 ≤ k ≤ 26", "1 ≤ |s| ≤ 100 000", "Lowercase letters only"],
    [("2\neceba\n", "3\n", "ece uses two letters; no longer window does."), ("1\naaabb\n", "3\n", "aaa is the longest block of one letter.")],
    tests,
    "Slide a window [lo, hi]. Extend hi one letter at a time, tracking how many times each letter occurs in the window. While the window has more than k different letters, advance lo. Record the largest window seen. Each index moves forward at most once, so O(n).",
    solve, brute, small))


# ------------------------------------------------------------ rotated sorted search
def solve(text):
    d = text.split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    out = []
    for x in map(int, d[2 + n:2 + n + q]):
        lo, hi, ans = 0, n - 1, -1
        while lo <= hi:
            mid = (lo + hi) // 2
            if a[mid] == x:
                ans = mid
                break
            if a[lo] <= a[mid]:
                if a[lo] <= x < a[mid]:
                    hi = mid - 1
                else:
                    lo = mid + 1
            elif a[mid] < x <= a[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
        out.append(ans)
    return '\n'.join(map(str, out))


def brute(text):
    d = text.split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    return '\n'.join(str(a.index(x)) if x in a else '-1' for x in map(int, d[2 + n:2 + n + q]))


def small(r):
    n = r.randint(1, 8)
    a = sorted(r.sample(range(-10, 11), n))
    k = r.randrange(n)
    a = a[k:] + a[:k]
    return f"{n} 4\n{line(a)}\n{line(ints(r, 4, -11, 11))}\n"


def tests():
    r = rng(38)
    base = sorted(r.sample(range(-10**9, 10**9), 100000))
    a = base[31337:] + base[:31337]
    qs = [r.choice(base) for _ in range(50000)] + ints(r, 50000, -10**9, 10**9)
    return ["1 1\n5\n5\n", "1 2\n5\n4 5\n", "2 2\n2 1\n1 2\n", "5 5\n4 5 1 2 3\n1 2 3 4 5\n", "4 3\n1 2 3 4\n1 4 5\n", f"100000 100000\n{line(a)}\n{line(qs)}\n"]


X2.append(prob(
    'rotated-sorted-search', 'Search in a Rotated Array', 'Medium', 'Binary Search', ['binary-search', 'array'], 20,
    "A sorted array of distinct integers was rotated: some prefix was moved to the end, for example [1,2,3,4,5] became [4,5,1,2,3]. "
    "For each query, print the position of the value in the rotated array, or -1 if it is absent.",
    "Line 1: n and q.\nLine 2: the rotated array.\nLine 3: q queries.", "q lines, one answer per query.",
    ["1 ≤ n, q ≤ 100 000", "All array values are distinct", "-10^9 ≤ values ≤ 10^9"],
    [("5 3\n4 5 1 2 3\n1 4 9\n", "2\n0\n-1\n", "1 is at position 2, 4 at position 0, and 9 is not present.")],
    tests,
    "At every step one half of [lo, hi] is still sorted: compare a[lo] with a[mid] to find which. If x lies inside the sorted half's range, search it; otherwise search the other half. That halves the range each time, so O(log n) per query.",
    solve, brute, small))


# ------------------------------------------------------------ house robber
def solve(text):
    d = text.split()
    n = int(d[0])
    take, skip = 0, 0
    for x in map(int, d[1:1 + n]):
        take, skip = skip + x, max(take, skip)
    return max(take, skip)


def brute(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    best = 0
    for mask in range(1 << n):
        if mask & (mask >> 1):
            continue
        best = max(best, sum(a[i] for i in range(n) if mask >> i & 1))
    return best


def small(r):
    n = r.randint(1, 10)
    return f"{n}\n{line(ints(r, n, 0, 9))}\n"


def tests():
    r = rng(39)
    return ["1\n7\n", "2\n3 9\n", "3\n2 1 2\n", "5\n0 0 0 0 0\n", "4\n1 100 1 100\n", f"100000\n{line(ints(r, 100000, 0, 10**4))}\n", f"100000\n{line([10**4] * 100000)}\n"]


X2.append(prob(
    'house-robber', 'Non-Adjacent Maximum Sum', 'Medium', 'Dynamic Programming', ['dp', 'array'], 20,
    "A row of houses holds a[i] coins each. You may take the coins from any set of houses as long as no two chosen houses are next to each other. Print the largest total you can collect.",
    "Line 1: n.\nLine 2: n integers.", "The maximum total.",
    ["1 ≤ n ≤ 100 000", "0 ≤ a[i] ≤ 10 000"],
    [("4\n1 2 3 1\n", "4\n", "Take houses 0 and 2: 1 + 3."), ("5\n2 7 9 3 1\n", "12\n", "Take houses 0, 2 and 4: 2 + 9 + 1.")],
    tests,
    "Let best(i) be the maximum using the first i houses. Either skip house i (best(i-1)) or take it (best(i-2) + a[i]). Only the last two values are needed, so O(n) time and O(1) memory.",
    solve, brute, small))


# ------------------------------------------------------------ grid paths with obstacles
def solve(text):
    d = text.split()
    h, w = int(d[0]), int(d[1])
    g = d[2:2 + h]
    M = 10**9 + 7
    row = [0] * w
    for i in range(h):
        for j in range(w):
            if g[i][j] == '#':
                row[j] = 0
            elif i == 0 and j == 0:
                row[j] = 1
            elif j > 0:
                row[j] = (row[j] + row[j - 1]) % M
    return row[w - 1] % M


def brute(text):
    import sys
    sys.setrecursionlimit(10000)
    d = text.split()
    h, w = int(d[0]), int(d[1])
    g = d[2:2 + h]

    def go(i, j):
        if i >= h or j >= w or g[i][j] == '#':
            return 0
        if i == h - 1 and j == w - 1:
            return 1
        return go(i + 1, j) + go(i, j + 1)
    return go(0, 0) % (10**9 + 7)


def small(r):
    h, w = r.randint(1, 5), r.randint(1, 5)
    g = [''.join('#' if r.random() < 0.25 else '.' for _ in range(w)) for _ in range(h)]
    g[0] = '.' + g[0][1:]
    g[-1] = g[-1][:-1] + '.'
    return f"{h} {w}\n" + '\n'.join(g) + '\n'


def tests():
    r = rng(40)
    def grid(h, w, p):
        g = [''.join('#' if r.random() < p else '.' for _ in range(w)) for _ in range(h)]
        g[0] = '.' + g[0][1:]
        g[-1] = g[-1][:-1] + '.'
        return f"{h} {w}\n" + '\n'.join(g) + '\n'
    return ["1 1\n.\n", "2 2\n..\n..\n", "2 2\n.#\n#.\n", "3 3\n...\n.#.\n...\n", grid(1000, 1000, 0.0), grid(1000, 1000, 0.1), grid(1, 1000, 0.0), grid(1000, 1000, 0.3)]


X2.append(prob(
    'grid-paths-obstacles', 'Grid Paths with Obstacles', 'Medium', 'Dynamic Programming', ['dp', 'grid'], 20,
    "A robot starts in the top-left cell of a grid and must reach the bottom-right cell, moving only right or down. Cells marked # are blocked. "
    "Count the different paths, modulo 1 000 000 007.",
    "Line 1: h and w.\nNext h lines: w characters each, '.' for open and '#' for blocked.", "The number of paths modulo 1 000 000 007.",
    ["1 ≤ h, w ≤ 1 000", "The start and finish cells are open"],
    [("3 3\n...\n.#.\n...\n", "2\n", "Go around the blocked centre either way."), ("2 2\n..\n..\n", "2\n", "Right-down or down-right.")],
    tests,
    "paths(i, j) = paths(i-1, j) + paths(i, j-1) for open cells and 0 for blocked ones, seeded with paths(0, 0) = 1. Only one row is needed at a time. O(h · w).",
    solve, brute, small))


# ------------------------------------------------------------ edit distance
def solve(text):
    a, b = text.split()
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[len(b)]


def brute(text):
    from collections import deque
    a, b = text.split()
    seen = {a: 0}
    dq = deque([a])
    while dq:
        s = dq.popleft()
        if s == b:
            return seen[s]
        nxt = []
        for i in range(len(s) + 1):
            for c in 'abc':
                nxt.append(s[:i] + c + s[i:])
        for i in range(len(s)):
            nxt.append(s[:i] + s[i + 1:])
            for c in 'abc':
                nxt.append(s[:i] + c + s[i + 1:])
        for t in nxt:
            if len(t) <= 8 and t not in seen:
                seen[t] = seen[s] + 1
                dq.append(t)
    return -1


def small(r):
    mk = lambda: ''.join(r.choice('abc') for _ in range(r.randint(1, 4)))
    return f"{mk()}\n{mk()}\n"


def tests():
    r = rng(41)
    mk = lambda n: ''.join(r.choice('abcd') for _ in range(n))
    return ["a\na\n", "a\nb\n", "kitten\nsitting\n", "intention\nexecution\n", "abc\nabc\n", f"{mk(2000)}\n{mk(2000)}\n", f"{'a' * 2000}\n{'b' * 1500}\n"]


X2.append(prob(
    'edit-distance', 'Edit Distance', 'Medium', 'Dynamic Programming', ['dp', 'string'], 20,
    "The edit distance between two words is the smallest number of single-letter operations that turn one into the other. "
    "An operation is inserting a letter, deleting a letter, or replacing a letter with another. Print the edit distance.",
    "Line 1: the first word.\nLine 2: the second word.", "The edit distance.",
    ["1 ≤ length of each word ≤ 2 000", "Lowercase letters only"],
    [("kitten\nsitting\n", "3\n", "kitten → sitten → sittin → sitting."), ("abc\nabc\n", "0\n", "Already equal.")],
    tests,
    "Let D[i][j] be the distance between the first i letters of one word and the first j of the other. D[i][0] = i and D[0][j] = j. Otherwise D[i][j] is the minimum of deleting (D[i-1][j] + 1), inserting (D[i][j-1] + 1) and replacing (D[i-1][j-1] plus 1 if the letters differ). O(|a|·|b|), with two rows of memory.",
    solve, brute, small))


# ------------------------------------------------------------ connected components
def solve(text):
    d = text.split()
    n, m = int(d[0]), int(d[1])
    p = list(range(n + 1))

    def find(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    for i in range(m):
        a, b = find(int(d[2 + 2 * i])), find(int(d[3 + 2 * i]))
        if a != b:
            p[a] = b
    sizes = {}
    for v in range(1, n + 1):
        sizes[find(v)] = sizes.get(find(v), 0) + 1
    return f"{len(sizes)} {max(sizes.values())}"


def brute(text):
    d = text.split()
    n, m = int(d[0]), int(d[1])
    adj = {v: [] for v in range(1, n + 1)}
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    seen, sizes = set(), []
    for s in range(1, n + 1):
        if s in seen:
            continue
        stack, cnt = [s], 0
        seen.add(s)
        while stack:
            v = stack.pop()
            cnt += 1
            for u in adj[v]:
                if u not in seen:
                    seen.add(u)
                    stack.append(u)
        sizes.append(cnt)
    return f"{len(sizes)} {max(sizes)}"


def small(r):
    n = r.randint(1, 8)
    m = r.randint(0, 8)
    return f"{n} {m}\n" + ''.join(f"{r.randint(1, n)} {r.randint(1, n)}\n" for _ in range(m))


def tests():
    r = rng(42)
    n = 200000
    return ["1 0\n", "3 0\n", "4 3\n1 2\n2 3\n3 4\n", "5 2\n1 1\n2 3\n", f"{n} 150000\n" + ''.join(f"{r.randint(1, n)} {r.randint(1, n)}\n" for _ in range(150000)),
            f"{n} {n - 1}\n" + ''.join(f"{i} {i + 1}\n" for i in range(1, n))]


X2.append(prob(
    'connected-components', 'Connected Components', 'Medium', 'Graphs', ['graph', 'union-find', 'dfs'], 20,
    "An undirected graph has n vertices numbered 1 to n and m edges. Print how many connected components it has and how many vertices the largest one contains. Self-loops and repeated edges may appear.",
    "Line 1: n and m.\nNext m lines: two vertices a and b joined by an edge.", "Two integers: the number of components and the largest component size.",
    ["1 ≤ n ≤ 200 000", "0 ≤ m ≤ 200 000"],
    [("6 4\n1 2\n2 3\n4 5\n5 4\n", "3 3\n", "Components: {1,2,3}, {4,5} and {6}.")],
    tests,
    "Union-find: start with every vertex in its own set and merge the endpoints of each edge. With path compression the cost is almost O(1) per edge. Count the distinct roots, and track the size of each. A DFS or BFS from each unvisited vertex gives the same result.",
    solve, brute, small))


# ------------------------------------------------------------ BFS shortest path
def solve(text):
    from collections import deque
    d = text.split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    dist = [-1] * (n + 1)
    dist[1] = 0
    q = deque([1])
    while q:
        v = q.popleft()
        for u in adj[v]:
            if dist[u] < 0:
                dist[u] = dist[v] + 1
                q.append(u)
    return dist[n]


def brute(text):
    d = text.split()
    n, m = int(d[0]), int(d[1])
    INF = 10**9
    D = [[INF] * (n + 1) for _ in range(n + 1)]
    for v in range(1, n + 1):
        D[v][v] = 0
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        if a != b:
            D[a][b] = D[b][a] = 1
    for k in range(1, n + 1):
        for i in range(1, n + 1):
            for j in range(1, n + 1):
                D[i][j] = min(D[i][j], D[i][k] + D[k][j])
    return D[1][n] if D[1][n] < INF else -1


def small(r):
    n = r.randint(1, 8)
    m = r.randint(0, 10)
    return f"{n} {m}\n" + ''.join(f"{r.randint(1, n)} {r.randint(1, n)}\n" for _ in range(m))


def tests():
    r = rng(43)
    n = 200000
    return ["1 0\n", "2 0\n", "2 1\n1 2\n", "4 2\n1 2\n3 4\n", f"{n} {n - 1}\n" + ''.join(f"{i} {i + 1}\n" for i in range(1, n)),
            f"{n} 300000\n" + ''.join(f"{r.randint(1, n)} {r.randint(1, n)}\n" for _ in range(300000))]


X2.append(prob(
    'bfs-shortest-path', 'Fewest Roads', 'Medium', 'Graphs', ['graph', 'bfs', 'shortest-path'], 20,
    "A country has n cities joined by m two-way roads. Find the fewest roads you must use to travel from city 1 to city n, or print -1 if it is impossible.",
    "Line 1: n and m.\nNext m lines: two cities joined by a road.", "The minimum number of roads, or -1.",
    ["1 ≤ n ≤ 200 000", "0 ≤ m ≤ 300 000", "If n = 1 the answer is 0"],
    [("5 5\n1 2\n2 3\n1 4\n4 5\n3 5\n", "2\n", "1 → 4 → 5 uses two roads."), ("3 1\n1 2\n", "-1\n", "City 3 cannot be reached.")],
    tests,
    "Every road costs the same, so breadth-first search from city 1 reaches cities in order of distance. The first time city n is discovered, its distance is minimal. O(n + m).",
    solve, brute, small))


# ------------------------------------------------------------ 0/1 knapsack
def solve(text):
    d = text.split()
    n, W = int(d[0]), int(d[1])
    dp = [0] * (W + 1)
    for i in range(n):
        w, v = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        for c in range(W, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]


def brute(text):
    d = text.split()
    n, W = int(d[0]), int(d[1])
    items = [(int(d[2 + 2 * i]), int(d[3 + 2 * i])) for i in range(n)]
    best = 0
    for mask in range(1 << n):
        w = sum(items[i][0] for i in range(n) if mask >> i & 1)
        if w <= W:
            best = max(best, sum(items[i][1] for i in range(n) if mask >> i & 1))
    return best


def small(r):
    n = r.randint(1, 8)
    return f"{n} {r.randint(1, 15)}\n" + ''.join(f"{r.randint(1, 8)} {r.randint(1, 20)}\n" for _ in range(n))


def tests():
    r = rng(44)
    big = ''.join(f"{r.randint(1, 500)} {r.randint(1, 10**6)}\n" for _ in range(100))
    return ["1 1\n2 5\n", "1 5\n5 7\n", "3 4\n1 1\n3 4\n4 5\n", "3 50\n10 60\n20 100\n30 120\n", f"100 10000\n{big}", "2 10000\n10000 1\n10000 2\n"]


X2.append(prob(
    'knapsack-01', '0/1 Knapsack', 'Medium', 'Dynamic Programming', ['dp', 'knapsack'], 20,
    "A bag holds at most W units of weight. There are n items, each with a weight and a value, and each can be taken at most once. Print the largest total value that fits in the bag.",
    "Line 1: n and W.\nNext n lines: weight and value of an item.", "The maximum total value.",
    ["1 ≤ n ≤ 100", "1 ≤ W ≤ 10 000", "1 ≤ weight ≤ 10 000", "1 ≤ value ≤ 10^6"],
    [("3 50\n10 60\n20 100\n30 120\n", "220\n", "Take the items of weight 20 and 30."), ("2 5\n6 10\n7 20\n", "0\n", "Nothing fits.")],
    tests,
    "Let dp[c] be the best value with capacity c. For each item, update capacities from W down to the item's weight: dp[c] = max(dp[c], dp[c - w] + v). Going downwards stops the same item being used twice. O(n · W).",
    solve, brute, small))


# Already covered by the original bank; dropped to avoid duplicates.
X2 = [p for p in X2 if p['slug'] != 'edit-distance']

