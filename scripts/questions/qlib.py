"""Compact problem builder for the extended bank (bank_x*.py).

A problem is described by plain Python functions:
  solve(text) -> str   reference solution, stdin text in, expected stdout (no trailing newline) out
  brute(text) -> str   independent, obviously-correct slow version used to cross-check solve
  small(r)    -> str   random SMALL input (r is a random.Random) used for the cross-check
  tests()     -> list  hidden inputs (edge cases first, then random and large ones)
build.py runs solve on every input, checks the statement's samples, and compares against brute.
"""
import inspect
import random
import textwrap


def rng(seed):
    return random.Random(seed)


def ints(r, n, lo, hi):
    return [r.randint(lo, hi) for _ in range(n)]


def line(xs):
    return ' '.join(map(str, xs))


def prob(slug, title, difficulty, category, tags, points, statement, input_format, output_format,
         constraints, samples, tests, editorial, solve, brute, small):
    src = textwrap.dedent(inspect.getsource(solve))
    program = f"import sys\n{src}\nsys.stdout.write(str({solve.__name__}(sys.stdin.read())) + '\\n')\n"
    return dict(
        slug=slug, title=title, difficulty=difficulty, category=category, tags=tags, points=points,
        statement=statement, input_format=input_format, output_format=output_format,
        constraints=constraints, samples=samples, hidden=tests, editorial=editorial,
        py=program, js='', fn=solve, brute=brute, small=small,
    )
