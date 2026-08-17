---
title: Hashmaps and Sliding Windows
summary: Build a predictable longest-unique-substring routine, then explain the invariants that keep it linear at production traffic.
order: 1
difficulty: beginner
estimatedMinutes: 45
categories: [coding]
languages: [java, python]
skills: [hashmaps, sliding-window, complexity-analysis, API-design]
labPath: coding-labs/hashmaps-sliding-window
status: ready
tags: [strings, interview-foundation, backend]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Given a string, return the length of its longest substring with no repeated characters. Clarify that a substring is contiguous and that empty input returns `0`. The senior question is: how do you state and preserve an invariant so a simple algorithm remains correct as its contract evolves?

## What you will build

Build `longestUniqueLength(text)` in Java and Python. It returns a deterministic integer without mutating input. The production extension is a streaming version that reports the best window while consuming a bounded character stream.

## Requirements and constraints

Support empty text, repeated characters, Unicode code points as documented by each language, and inputs that do not fit a quadratic approach. Do not sort or create every substring. Treat `null`/`None` explicitly: reject it or document an empty-value policy.

## Suggested API or interface

`int longestUniqueLength(String text)` and `def longest_unique_length(text: str) -> int`. Optionally expose `WindowResult(length, start, endExclusive)` for callers that need the substring location.

## Starter-to-solution checkpoints

1. Write a brute-force oracle for tiny inputs.
2. Keep `left`, `right`, and a map from character to last seen index.
3. On a repeat within the window, move `left` forward only.
4. Prove each pointer moves at most the input length.
5. Decide how code-point iteration changes indexes in your API.

## Java and/or Python implementation notes

Use `HashMap<Integer, Integer>` over Java code points or `dict[str, int]` for the introductory version. Keep the map update after the window adjustment. The runnable Java lab deliberately iterates code points so one emoji is one logical character; Python strings already iterate Unicode code points.

## Test cases and edge cases

Test `""`, `"a"`, `"abba"`, `"pwwkew"`, all-unique input, all-identical input, and a Unicode example. Compare random short strings with the brute-force oracle. Repeated calls must not leak state between requests.

## Complexity and resource analysis

Time is O(n): each endpoint advances monotonically. Space is O(min(n, alphabet size)). Explain why the map’s retained history is safe even after `left` moves.

## Concurrency and failure behavior

The pure function is naturally thread-safe when it owns its map. A streaming adapter needs per-session state and a bounded maximum window; reject malformed chunks and avoid sharing mutable maps across requests.

## Production extension questions

How would you process chunks that split a Unicode sequence? What telemetry distinguishes oversized input from an algorithm regression? When would an approximate, bounded-memory answer be acceptable?

## Interview explanation checklist

- State the moving-window invariant.
- Walk through `abba`.
- Explain why `left` never moves backward.
- Give O(n) time and bounded-space reasoning.
- Name the Unicode and streaming contract decisions.

## References

- [Java `HashMap` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)
- [Python `dict` documentation](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict)
