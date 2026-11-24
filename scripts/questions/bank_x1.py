"""Extended bank, part 1: 15 easy problems (arrays, strings, math, stacks). See qlib.prob for the format."""
from qlib import ints, line, prob, rng

X1 = []


# ------------------------------------------------------------ max and position
def solve(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    m = max(a)
    return f"{m} {a.index(m)}"


def brute(text):
    d = text.split()
    n = int(d[0])
    best, at = None, -1
    for i in range(n):
        v = int(d[1 + i])
        if best is None or v > best:
            best, at = v, i
    return f"{best} {at}"


def small(r):
    n = r.randint(1, 8)
    return f"{n}\n{line(ints(r, n, -5, 5))}\n"


def tests():
    r = rng(11)
    t = ["1\n-7\n", "4\n2 2 2 2\n", "5\n-3 -1 -4 -1 -9\n", "3\n1 2 3\n", "3\n3 2 1\n"]
    t.append(f"100000\n{line(ints(r, 100000, -10**9, 10**9))}\n")
    a = ints(r, 99999, -10**9, 10**8) + [10**9]
    t.append(f"100000\n{line(a)}\n")
    return t


X1.append(prob(
    'max-and-position', 'Maximum and Its Position', 'Easy', 'Arrays', ['array', 'scan'], 10,
    "Given an array of integers, print the largest value and the position of its first occurrence.",
    "Line 1: n.\nLine 2: n integers.", "The maximum, a space, then its 0-based position.",
    ["1 ≤ n ≤ 100 000", "-10^9 ≤ a[i] ≤ 10^9"],
    [("5\n3 9 2 9 1\n", "9 1\n", "The maximum 9 first appears at position 1."),
     ("3\n-4 -4 -4\n", "-4 0\n", "All values are equal, so the first position wins.")],
    tests,
    "One pass keeping the best value so far and where it was found. Update only on a strictly larger value so that the first occurrence is kept. O(n).",
    solve, brute, small))


# ------------------------------------------------------------ reverse words
def solve(text):
    return ' '.join(reversed(text.split()))


def brute(text):
    words, cur = [], ''
    for ch in text + ' ':
        if ch in ' \n':
            if cur:
                words.append(cur)
            cur = ''
        else:
            cur += ch
    out = ''
    for w in words:
        out = w + (' ' + out if out else '')
    return out


def small(r):
    k = r.randint(1, 5)
    return ''.join(' ' * r.randint(0, 2) + ''.join(r.choice('abc') for _ in range(r.randint(1, 4))) for _ in range(k)) + ' ' * r.randint(0, 2) + '\n'


def tests():
    r = rng(12)
    words = [''.join(r.choice('abcdefgh') for _ in range(r.randint(1, 9))) for _ in range(8000)]
    return ["hello\n", "  a   b  \n", "one two three four\n", "x y\n", " lead and trail \n", ' '.join(words) + '\n']


X1.append(prob(
    'reverse-words', 'Reverse the Words', 'Easy', 'Strings', ['string', 'parsing'], 10,
    "A line contains words separated by one or more spaces (there may be spaces at the start or end). "
    "Print the words in reverse order, separated by exactly one space.",
    "One line of text.", "The words in reverse order, separated by single spaces.",
    ["1 ≤ line length ≤ 100 000", "Words contain only lowercase letters", "The line contains at least one word"],
    [("the sky is blue\n", "blue is sky the\n", "Reading the words right to left."),
     ("  hello   world  \n", "world hello\n", "Extra spaces disappear.")],
    tests,
    "Split on whitespace (skipping empty pieces), reverse the list and join with one space. O(length).",
    solve, brute, small))


# ------------------------------------------------------------ alphanumeric palindrome
def solve(text):
    s = [c.lower() for c in text if c.isalnum()]
    return 'YES' if s == s[::-1] else 'NO'


def brute(text):
    s = ''.join(c for c in text if c.isascii() and (c.isalpha() or c.isdigit())).lower()
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return 'NO'
        i += 1
        j -= 1
    return 'YES'


def small(r):
    return ''.join(r.choice('aAbB1, ') for _ in range(r.randint(0, 8))) + '\n'


def tests():
    r = rng(13)
    half = ''.join(r.choice('abcxyz019 ,.') for _ in range(40000))
    return ["a\n", "\n", "0P\n", "ab_a\n", "Was it a car or a cat I saw?\n", half + half[::-1] + '\n', half + 'q' + half[::-1][1:] + '\n']


X1.append(prob(
    'alnum-palindrome', 'Palindrome Ignoring Punctuation', 'Easy', 'Strings', ['string', 'two-pointers'], 10,
    "Decide whether a line of text is a palindrome when you look only at letters and digits and ignore upper/lower case. "
    "Spaces and punctuation are skipped.",
    "One line of printable ASCII text (it may be empty).", "YES or NO.",
    ["0 ≤ length ≤ 100 000"],
    [("A man, a plan, a canal: Panama\n", "YES\n", "Keeping letters only gives amanaplanacanalpanama, which reads the same both ways."),
     ("race a car\n", "NO\n", "raceacar is not a palindrome.")],
    tests,
    "Walk two pointers inwards from both ends, skipping characters that are not letters or digits, comparing lower-cased letters. An empty result counts as a palindrome. O(length).",
    solve, brute, small))


# ------------------------------------------------------------ gcd and lcm
def solve(text):
    from math import gcd
    a, b = map(int, text.split())
    g = gcd(a, b)
    return f"{g} {a // g * b}"


def brute(text):
    a, b = map(int, text.split())
    g = max(d for d in range(1, min(a, b) + 1) if a % d == 0 and b % d == 0)
    m = max(a, b)
    while m % a or m % b:
        m += 1
    return f"{g} {m}"


def small(r):
    return f"{r.randint(1, 40)} {r.randint(1, 40)}\n"


def tests():
    return ["1 1\n", "12 18\n", "17 13\n", "1000000000 1000000000\n", "999999937 1000000000\n", "1 1000000000\n", "123456789 987654321\n", "30 45\n"]


X1.append(prob(
    'gcd-and-lcm', 'GCD and LCM', 'Easy', 'Math', ['math', 'gcd'], 10,
    "Given two positive integers a and b, print their greatest common divisor and their least common multiple.",
    "One line with a and b.", "The GCD and the LCM, separated by a space.",
    ["1 ≤ a, b ≤ 10^9", "The LCM fits in a signed 64-bit integer"],
    [("12 18\n", "6 36\n", "Both divide 36 and share the factor 6."), ("7 5\n", "1 35\n", "Coprime numbers have GCD 1.")],
    tests,
    "Euclid's algorithm: gcd(a, b) = gcd(b, a mod b). Then lcm = a / gcd * b, dividing first so the intermediate value never overflows. O(log min(a, b)).",
    solve, brute, small))


# ------------------------------------------------------------ count primes
def solve(text):
    n = int(text.split()[0])
    if n < 2:
        return 0
    sieve = bytearray([1]) * (n + 1)
    sieve[0] = sieve[1] = 0
    for i in range(2, int(n ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(range(i * i, n + 1, i)))
    return sum(sieve)


def brute(text):
    n = int(text.split()[0])
    return sum(1 for x in range(2, n + 1) if all(x % d for d in range(2, x)))


def small(r):
    return f"{r.randint(1, 80)}\n"


def tests():
    return ["1\n", "2\n", "3\n", "100\n", "9973\n", "1000000\n", "999983\n", "65536\n"]


X1.append(prob(
    'count-primes', 'Count the Primes', 'Easy', 'Math', ['math', 'sieve'], 10,
    "Count how many prime numbers are less than or equal to n.",
    "One integer n.", "The number of primes ≤ n.",
    ["1 ≤ n ≤ 1 000 000"],
    [("10\n", "4\n", "The primes are 2, 3, 5 and 7."), ("1\n", "0\n", "1 is not prime.")],
    tests,
    "Sieve of Eratosthenes: mark multiples of each prime starting at p², then count the unmarked numbers from 2. O(n log log n). Testing every number by trial division would be far too slow near 10^6.",
    solve, brute, small))


# ------------------------------------------------------------ valid anagram
def solve(text):
    a, b = text.split()
    return 'YES' if sorted(a) == sorted(b) else 'NO'


def brute(text):
    a, b = text.split()
    b = list(b)
    for ch in a:
        if ch in b:
            b.remove(ch)
        else:
            return 'NO'
    return 'YES' if not b else 'NO'


def small(r):
    mk = lambda: ''.join(r.choice('abc') for _ in range(r.randint(1, 5)))
    a = mk()
    return f"{a}\n{(''.join(r.sample(a, len(a))) if r.random() < 0.5 else mk())}\n"


def tests():
    r = rng(16)
    s = ''.join(r.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(100000))
    t = list(s)
    r.shuffle(t)
    u = t[:]
    u[0] = 'a' if u[0] != 'a' else 'b'
    return ["a\na\n", "a\nb\n", "ab\nabc\n", "listen\nsilent\n", "aabb\nabab\n", f"{s}\n{''.join(t)}\n", f"{s}\n{''.join(u)}\n"]


X1.append(prob(
    'valid-anagram', 'Are They Anagrams?', 'Easy', 'Strings', ['string', 'counting'], 10,
    "Two words are anagrams if one can be rearranged into the other, using every letter exactly once. Decide whether the two given words are anagrams.",
    "Line 1: the first word.\nLine 2: the second word.", "YES or NO.",
    ["1 ≤ length ≤ 100 000", "Lowercase letters a to z only"],
    [("listen\nsilent\n", "YES\n", "Both use e, i, l, n, s, t once."), ("rat\ncar\n", "NO\n", "t and c differ.")],
    tests,
    "Count each letter of the first word up and the second down; they are anagrams exactly when every count ends at zero. Sorting both words also works in O(n log n).",
    solve, brute, small))


# ------------------------------------------------------------ rotate right
def solve(text):
    d = text.split()
    n, k = int(d[0]), int(d[1])
    a = d[2:2 + n]
    k %= n
    return ' '.join(a[n - k:] + a[:n - k])


def brute(text):
    d = text.split()
    n, k = int(d[0]), int(d[1])
    a = d[2:2 + n]
    for _ in range(k % n):
        a.insert(0, a.pop())
    return ' '.join(a)


def small(r):
    n = r.randint(1, 7)
    return f"{n} {r.randint(0, 20)}\n{line(ints(r, n, -9, 9))}\n"


def tests():
    r = rng(17)
    return ["1 5\n3\n", "3 0\n1 2 3\n", "3 3\n1 2 3\n", "5 2\n1 2 3 4 5\n", "4 1000000000\n1 2 3 4\n",
            f"100000 999999999\n{line(ints(r, 100000, -10**9, 10**9))}\n"]


X1.append(prob(
    'rotate-right', 'Rotate the Array', 'Easy', 'Arrays', ['array', 'modulo'], 10,
    "Rotate an array to the right by k steps: each step moves the last element to the front. Print the array after k steps.",
    "Line 1: n and k.\nLine 2: n integers.", "The rotated array on one line.",
    ["1 ≤ n ≤ 100 000", "0 ≤ k ≤ 10^9", "-10^9 ≤ a[i] ≤ 10^9"],
    [("5 2\n1 2 3 4 5\n", "4 5 1 2 3\n", "Two steps: 5 1 2 3 4, then 4 5 1 2 3."), ("3 4\n7 8 9\n", "9 7 8\n", "k = 4 acts like k = 1 because rotating n times changes nothing.")],
    tests,
    "Rotating n times returns the original array, so only k mod n matters. The result is the last k mod n elements followed by the rest. O(n), and k is never simulated step by step.",
    solve, brute, small))


# ------------------------------------------------------------ majority element
def solve(text):
    d = text.split()
    n = int(d[0])
    a = d[1:1 + n]
    cand, c = None, 0
    for x in a:
        if c == 0:
            cand, c = x, 1
        elif x == cand:
            c += 1
        else:
            c -= 1
    return int(cand) if a.count(cand) * 2 > n else -1


def brute(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    for v in set(a):
        if a.count(v) > n // 2:
            return v
    return -1


def small(r):
    n = r.randint(1, 9)
    return f"{n}\n{line(ints(r, n, 0, 2))}\n"


def tests():
    r = rng(18)
    maj = [7] * 50001 + ints(r, 49999, 0, 10**9)
    r.shuffle(maj)
    nomaj = [7] * 50000 + ints(r, 50000, 0, 10**9)
    r.shuffle(nomaj)
    return ["1\n5\n", "2\n1 2\n", "4\n2 2 1 1\n", "5\n3 3 4 2 3\n", f"100000\n{line(maj)}\n", f"100000\n{line(nomaj)}\n"]


X1.append(prob(
    'majority-element', 'Majority Element', 'Easy', 'Arrays', ['array', 'voting'], 10,
    "An element is a majority if it appears strictly more than n / 2 times. Print the majority element, or -1 if there is none.",
    "Line 1: n.\nLine 2: n integers.", "The majority element or -1.",
    ["1 ≤ n ≤ 100 000", "0 ≤ a[i] ≤ 10^9"],
    [("5\n3 3 4 2 3\n", "3\n", "3 appears 3 times out of 5."), ("4\n1 2 1 2\n", "-1\n", "Two of four is not more than half.")],
    tests,
    "Boyer-Moore voting keeps one candidate and a counter: matching values add one, others subtract one, and a zero counter picks a new candidate. A majority always survives. A second pass confirms the count. O(n) time, O(1) extra space.",
    solve, brute, small))


# ------------------------------------------------------------ digital root
def solve(text):
    s = text.split()[0]
    while len(s) > 1:
        s = str(sum(int(c) for c in s))
    return s


def brute(text):
    n = int(text.split()[0])
    return 0 if n == 0 else 1 + (n - 1) % 9


def small(r):
    return f"{r.randint(0, 5000)}\n"


def tests():
    return ["0\n", "9\n", "10\n", "38\n", "999999999999999999\n", "123456789012345678\n", "1000000000000000000\n", "18\n"]


X1.append(prob(
    'digital-root', 'Digital Root', 'Easy', 'Math', ['math', 'digits'], 10,
    "Add the digits of a number; if the result has more than one digit, add its digits again, and keep going until one digit remains. Print that digit.",
    "One integer n.", "The single remaining digit.",
    ["0 ≤ n ≤ 10^18"],
    [("38\n", "2\n", "3 + 8 = 11, then 1 + 1 = 2."), ("0\n", "0\n", "Zero is already one digit.")],
    tests,
    "Simulate it: n has at most 19 digits, so only a few rounds are needed. A closed form also exists: for n > 0 the answer is 1 + (n - 1) mod 9.",
    solve, brute, small))


# ------------------------------------------------------------ missing number
def solve(text):
    d = text.split()
    n = int(d[0])
    return n * (n + 1) // 2 - sum(map(int, d[1:1 + n]))


def brute(text):
    d = text.split()
    n = int(d[0])
    have = set(map(int, d[1:1 + n]))
    return next(v for v in range(n + 1) if v not in have)


def small(r):
    n = r.randint(1, 9)
    a = list(range(n + 1))
    a.pop(r.randrange(n + 1))
    r.shuffle(a)
    return f"{n}\n{line(a)}\n"


def tests():
    r = rng(20)
    n = 100000
    a = list(range(n + 1))
    a.pop(r.randrange(n + 1))
    r.shuffle(a)
    b = list(range(1, n + 1))
    c = list(range(n))
    return ["1\n1\n", "1\n0\n", "3\n3 0 1\n", "2\n0 1\n", f"{n}\n{line(a)}\n", f"{n}\n{line(b)}\n", f"{n}\n{line(c)}\n"]


X1.append(prob(
    'missing-number', 'Missing Number', 'Easy', 'Arrays', ['array', 'math'], 10,
    "An array holds n distinct integers taken from 0, 1, …, n. Exactly one number from that range is missing. Find it.",
    "Line 1: n.\nLine 2: n integers.", "The missing number.",
    ["1 ≤ n ≤ 100 000"],
    [("3\n3 0 1\n", "2\n", "The range is 0 to 3 and 2 is absent."), ("2\n0 1\n", "2\n", "Nothing below 2 is missing, so 2 is.")],
    tests,
    "The numbers 0 to n add up to n(n+1)/2. Subtract the sum of the array and what is left is the missing value. O(n) time, O(1) space.",
    solve, brute, small))


# ------------------------------------------------------------ distinct sorted
def solve(text):
    d = text.split()
    n = int(d[0])
    u = sorted(set(map(int, d[1:1 + n])))
    return f"{len(u)}\n{line(u)}"


def brute(text):
    d = text.split()
    n = int(d[0])
    u = []
    for x in map(int, d[1:1 + n]):
        if x not in u:
            u.append(x)
    for i in range(len(u)):
        for j in range(i + 1, len(u)):
            if u[j] < u[i]:
                u[i], u[j] = u[j], u[i]
    return f"{len(u)}\n{line(u)}"


def small(r):
    n = r.randint(1, 9)
    return f"{n}\n{line(ints(r, n, -4, 4))}\n"


def tests():
    r = rng(21)
    return ["1\n5\n", "4\n2 2 2 2\n", "5\n5 4 3 2 1\n", f"100000\n{line(ints(r, 100000, -10**9, 10**9))}\n", f"100000\n{line(ints(r, 100000, 0, 50))}\n"]


X1.append(prob(
    'distinct-sorted', 'Distinct Values in Order', 'Easy', 'Arrays', ['array', 'sorting', 'set'], 10,
    "Print how many distinct values an array contains, then those distinct values in increasing order.",
    "Line 1: n.\nLine 2: n integers.", "Line 1: the count k.\nLine 2: the k distinct values in ascending order.",
    ["1 ≤ n ≤ 100 000", "-10^9 ≤ a[i] ≤ 10^9"],
    [("6\n4 1 4 2 1 9\n", "4\n1 2 4 9\n", "Distinct values: 1, 2, 4, 9."), ("3\n5 5 5\n", "1\n5\n", "Only one distinct value.")],
    tests,
    "Put the values in a set to drop duplicates, then sort what remains. O(n log n).",
    solve, brute, small))


# ------------------------------------------------------------ longest common prefix
def solve(text):
    d = text.split()
    n = int(d[0])
    w = d[1:1 + n]
    p = w[0]
    for s in w[1:]:
        while not s.startswith(p):
            p = p[:-1]
    return p if p else 'NONE'


def brute(text):
    d = text.split()
    n = int(d[0])
    w = d[1:1 + n]
    k = 0
    while all(k < len(s) for s in w) and len({s[k] for s in w}) == 1:
        k += 1
    return w[0][:k] if k else 'NONE'


def small(r):
    n = r.randint(1, 4)
    return f"{n}\n" + '\n'.join(''.join(r.choice('ab') for _ in range(r.randint(1, 5))) for _ in range(n)) + '\n'


def tests():
    r = rng(23)
    base = 'q' * 30000
    return ["1\nsolo\n", "2\nab\ncd\n", "3\nflower\nflow\nflight\n", "3\nsame\nsame\nsame\n", "2\nabc\nabcde\n",
            f"3\n{base}x\n{base}y\n{base}\n", f"50\n" + '\n'.join(base[:i * 100 + 1000] + 'z' for i in range(50)) + '\n']


X1.append(prob(
    'longest-common-prefix', 'Longest Common Prefix', 'Easy', 'Strings', ['string', 'prefix'], 10,
    "Given n words, find the longest string that is a prefix of every word. If the words share no first letter, print NONE.",
    "Line 1: n.\nNext n lines: one lowercase word each.", "The longest common prefix, or NONE.",
    ["1 ≤ n ≤ 1 000", "1 ≤ length of each word", "Total length ≤ 200 000"],
    [("3\nflower\nflow\nflight\n", "fl\n", "All three start with fl."), ("2\ndog\nracecar\n", "NONE\n", "d and r differ immediately.")],
    tests,
    "Start with the first word as the candidate and trim it until it prefixes the next word; repeat for every word. Equivalent: compare column by column and stop at the first mismatch. O(total length).",
    solve, brute, small))


# ------------------------------------------------------------ balanced brackets
def solve(text):
    pairs = {')': '(', ']': '[', '}': '{'}
    st = []
    for c in text.strip():
        if c in '([{':
            st.append(c)
        elif not st or st.pop() != pairs[c]:
            return 'NO'
    return 'YES' if not st else 'NO'


def brute(text):
    s = text.strip()
    while True:
        t = s.replace('()', '').replace('[]', '').replace('{}', '')
        if t == s:
            return 'YES' if s == '' else 'NO'
        s = t


def small(r):
    return ''.join(r.choice('()[]{}') for _ in range(r.randint(1, 10))) + '\n'


def tests():
    r = rng(24)
    nest = '([{' * 20000 + '}])' * 20000
    t = ["()\n", "(\n", ")(\n", "([)]\n", "{[()]}\n", "(((((\n", nest + '\n', nest[:-1] + ']\n']
    for _ in range(3):
        s = list(nest[:3000])
        t.append(''.join(s) + '\n')
    return t


X1.append(prob(
    'balanced-brackets', 'Balanced Brackets', 'Easy', 'Stacks', ['stack', 'string'], 10,
    "A string made of the characters ( ) [ ] { } is balanced when every opening bracket is closed by the same kind of bracket, in the right order. Decide whether the string is balanced.",
    "One line containing the bracket string.", "YES or NO.",
    ["1 ≤ length ≤ 120 000"],
    [("{[()]}\n", "YES\n", "Each bracket closes the most recently opened one."), ("([)]\n", "NO\n", "The ] arrives while the last open bracket is (.")],
    tests,
    "Scan left to right with a stack. Push opening brackets; on a closing bracket the top of the stack must be its partner, otherwise the answer is NO. At the end the stack must be empty. O(n).",
    solve, brute, small))


# ------------------------------------------------------------ popcount queries
def solve(text):
    d = text.split()
    q = int(d[0])
    out = []
    for x in map(int, d[1:1 + q]):
        c = 0
        while x:
            x &= x - 1
            c += 1
        out.append(c)
    return '\n'.join(map(str, out))


def brute(text):
    d = text.split()
    q = int(d[0])
    return '\n'.join(str(bin(int(x)).count('1')) for x in d[1:1 + q])


def small(r):
    q = r.randint(1, 5)
    return f"{q}\n{line(ints(r, q, 0, 300))}\n"


def tests():
    r = rng(25)
    return ["1\n0\n", "3\n1 2 3\n", "2\n1023 1024\n", "2\n1000000000000000000 999999999999999999\n",
            f"100000\n{line(ints(r, 100000, 0, 10**18))}\n"]


X1.append(prob(
    'count-set-bits', 'Count the One Bits', 'Easy', 'Math', ['bit-manipulation'], 10,
    "For each of q numbers, print how many 1 bits its binary representation contains.",
    "Line 1: q.\nLine 2: q integers.", "q lines, one answer per number, in order.",
    ["1 ≤ q ≤ 100 000", "0 ≤ x ≤ 10^18"],
    [("3\n5 8 255\n", "2\n1\n8\n", "5 = 101, 8 = 1000 and 255 = 11111111 in binary.")],
    tests,
    "Repeatedly clear the lowest set bit with x &= x - 1 and count the steps; this runs once per 1 bit. Built-in popcount functions do the same. O(q · 60).",
    solve, brute, small))


# ------------------------------------------------------------ second largest distinct
def solve(text):
    d = text.split()
    n = int(d[0])
    u = sorted(set(map(int, d[1:1 + n])))
    return u[-2] if len(u) >= 2 else -1


def brute(text):
    d = text.split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    top = max(a)
    rest = [x for x in a if x != top]
    return max(rest) if rest else -1


def small(r):
    n = r.randint(1, 8)
    return f"{n}\n{line(ints(r, n, -3, 3))}\n"


def tests():
    r = rng(26)
    return ["1\n4\n", "2\n4 4\n", "2\n4 5\n", "5\n-1 -1 -2 -2 -2\n", "6\n9 9 9 8 8 7\n",
            f"100000\n{line(ints(r, 100000, -10**9, 10**9))}\n"]


X1.append(prob(
    'second-largest', 'Second Largest Value', 'Easy', 'Arrays', ['array', 'scan'], 10,
    "Print the second largest distinct value in the array, that is, the largest value that is smaller than the maximum. If every element is equal, print -1.",
    "Line 1: n.\nLine 2: n integers.", "The second largest distinct value, or -1.",
    ["1 ≤ n ≤ 100 000", "-10^9 ≤ a[i] ≤ 10^9"],
    [("5\n4 9 9 2 7\n", "7\n", "The maximum is 9 (twice); the next distinct value is 7."), ("3\n5 5 5\n", "-1\n", "No value is smaller than the maximum.")],
    tests,
    "Track the largest and the best value strictly below it in one pass, or sort the distinct values and take the second from the end. O(n).",
    solve, brute, small))


# Already covered by the original bank; dropped to avoid duplicates.
X1 = [p for p in X1 if p['slug'] not in ('reverse-words', 'count-primes')]

