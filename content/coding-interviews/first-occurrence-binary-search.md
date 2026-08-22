---
title: First-Occurrence Binary Search
summary: Modify binary search to return the leftmost duplicate, prove the invariant, prevent midpoint overflow, and answer the follow-ups expected in a senior coding interview.
order: 10
difficulty: intermediate
estimatedMinutes: 60
categories: [coding, algorithms]
languages: [java, python]
skills: [binary-search, invariants, boundary-analysis, complexity-analysis, testing]
labPath: coding-labs/first-occurrence-binary-search
status: ready
tags: [arrays, duplicates, lower-bound, interview-foundation]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Given an ascending sorted sequence and a key, return the index of the key’s **first occurrence**, or `-1` if it is absent.

For `[-40, -10, 20, 108, 108, 243, 285, 285, 285, 401]`, the answer for `108` is `3` and the answer for `285` is `6`.

Clarify before coding:

- Is input guaranteed to be sorted ascending?
- Are duplicates allowed? Yes—the first duplicate is the point of the exercise.
- What should null/`None`, empty input, and a missing key return?
- Can the sequence length exceed the integer index range?
- Is random access available, or is the input a linked/streaming structure?

The key hint is: **do not stop at the first match you encounter**.

## What you will build

Implement an iterative binary search that remembers a match and continues into the left half. Then explain the invariant, midpoint arithmetic, complexity, loop termination, tests, recursive alternative, and lower-bound interpretation.

A linear scan is a valuable correctness oracle for random small test cases, but it does not meet the large sorted-input objective.

## Requirements and constraints

- Reject null/`None` because it is a malformed caller contract.
- Return `-1` for empty input or an absent key.
- Return the lowest matching index for any number of duplicates, including an all-equal array.
- Do not mutate or sort the input.
- Use `middle = low + (high - low) / 2` rather than `(low + high) / 2` in fixed-width integer languages.
- Maintain progress on every branch so the loop always terminates.

### Loop invariant

At the start of each iteration, if a first occurrence has not already been recorded, it can only be inside `[low, high]`. If a match is recorded at `result`, any earlier match can only be left of it. When `values[middle] >= key`, discard the middle-to-right search space after recording equality; otherwise discard the left-to-middle search space.

## Suggested API or interface

Java:

```java
public static int find(int[] values, int key) {
  if (values == null) throw new IllegalArgumentException("values are required");
  int low = 0, high = values.length - 1, result = -1;
  while (low <= high) {
    int middle = low + (high - low) / 2;
    if (values[middle] >= key) {
      if (values[middle] == key) result = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return result;
}
```

Python:

```python
def find_first(values: Sequence[int], key: int) -> int:
    if values is None:
        raise ValueError("values are required")
    low, high, result = 0, len(values) - 1, -1
    while low <= high:
        middle = low + (high - low) // 2
        if values[middle] >= key:
            if values[middle] == key:
                result = middle
            high = middle - 1
        else:
            low = middle + 1
    return result
```

This is equivalent to finding the lower-bound insertion position and then checking whether that position contains the key.

## Starter-to-solution checkpoints

1. State the input and error contract.
2. Write a linear scan for tiny test-oracle inputs.
3. Implement ordinary binary search and observe that it may return any duplicate.
4. Add `result`; after equality, move `high` left instead of returning.
5. Walk through the all-equal case and the two-element case.
6. Prove that `[low, high]` shrinks on every iteration.
7. Replace unsafe midpoint addition with difference-first arithmetic.
8. Explain lower bound, upper bound, and how their difference counts occurrences.

## Java and/or Python implementation notes

Java integer division and Python `//` select the lower midpoint for non-negative indexes. A ceiling midpoint can also be correct, but only with matching boundary updates that guarantee progress. The important property is not floor versus ceiling in isolation; it is that each branch removes at least one candidate index.

Recursive binary search has the same logarithmic comparisons but consumes `O(log n)` call-stack space unless the language/runtime performs an applicable tail-call optimization. This first-occurrence recursion is not naturally a better production choice than the simple loop, and Python does not optimize tail recursion.

## Test cases and edge cases

| Input | Key | Expected | Why it matters |
| --- | ---: | ---: | --- |
| `[]` | 5 | `-1` | Empty range. |
| `[7]` | 7 | `0` | Smallest success. |
| `[7,7,7,7]` | 7 | `0` | Never stop at an arbitrary match. |
| `[1,3,5]` | 4 | `-1` | Missing value inside the range. |
| sample | `-40` | `0` | First endpoint. |
| sample | `401` | `9` | Last endpoint. |
| `null` / `None` | any | error | Explicit malformed-input policy. |

For stronger testing, generate short sorted arrays, compare the result with a linear oracle, and include keys below, inside, and above the data range.

## Complexity and resource analysis

Each iteration removes roughly half the remaining indexes, so iterative time is `O(log n)` and auxiliary space is `O(1)`. With this exact implementation, the general successful case still continues left after a match; do not casually claim `O(1)` best case except for a constant-sized input. A variant may return immediately when the match is at index zero or its left neighbor differs, but that optimization is unnecessary for the asymptotic result.

Sorting previously unsorted input costs at least the chosen sort’s complexity and changes the problem economics. One search rarely justifies sorting solely to use binary search; repeated searches or an already maintained ordered index may.

## Concurrency and failure behavior

The functions own only local variables and do not mutate input, so concurrent calls are safe when the caller does not concurrently modify the sequence. If an external collection can change while searching, snapshot it or coordinate access; “sorted at method entry” is not enough if writers reorder values mid-search.

For disk or remote data, comparison count is not the only cost. B-trees and related block-oriented indexes reduce expensive I/O more effectively than applying array binary search across network calls.

## Production extension questions

- Return the last occurrence or the half-open range of all occurrences.
- Implement lower bound: first index with `value >= key`.
- Implement upper bound: first index with `value > key`.
- Search a rotated sorted array or a conceptually unbounded reader.
- Binary-search an answer space for a monotonic feasibility predicate.
- Find a local minimum using neighbor comparisons and state the boundary assumptions.
- Explain why a linked list does not provide the random-access behavior this algorithm needs.

## Interview explanation checklist

- State sorted input, duplicate behavior, and the absent-value contract.
- Say the invariant before tracing code.
- Walk through `108`, `285`, and the all-equal case.
- Explain why equality moves left rather than returning.
- Use the difference-first midpoint and name fixed-width overflow.
- Give `O(log n)` time and `O(1)` iterative auxiliary space.
- Distinguish comparisons from storage or network access costs.

## References

- [Java `Arrays` searching documentation](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Arrays.html#binarySearch(int%5B%5D,int))
- [Python `bisect` documentation](https://docs.python.org/3/library/bisect.html)
