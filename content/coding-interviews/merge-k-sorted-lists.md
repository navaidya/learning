---
title: Merge K Sorted Lists
summary: Compare five merging strategies, implement the min-heap solution without mutating inputs, and explain external-memory and streaming extensions.
order: 11
difficulty: advanced
estimatedMinutes: 75
categories: [coding, algorithms, data-processing]
languages: [java, python]
skills: [linked-lists, heaps, divide-and-conquer, complexity-analysis, streaming]
labPath: coding-labs/merge-k-sorted-lists
status: ready
tags: [priority-queue, k-way-merge, external-merge, interview-algorithm]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

You receive `k` linked lists, each sorted in ascending order. Merge them into one ascending linked list and analyze the solution.

Example: `[1,4,5]`, `[1,3,4]`, and `[2,6]` become `[1,1,2,3,4,4,5,6]`.

Ask first:

- Can `k` be zero, and can individual list heads be null?
- May the result reuse and rewire input nodes, or must inputs remain unchanged?
- Are values comparable and can duplicates appear?
- What are the expected `k`, total nodes, and list-size distribution?
- Is everything in memory, or are these sorted files/streams?

Throughout this page, `N` means the **total nodes across all lists**, and `k` means the number of lists.

## What you will build

Implement a min-heap k-way merge. Keep at most one candidate from each list in the heap, repeatedly remove the minimum, append a copied output node, and insert that node’s successor.

Copying output nodes gives a clear non-mutation contract. If allocation dominates and ownership is transferred, a production implementation can rewire existing nodes and reduce extra output allocation.

## Requirements and constraints

| Approach | Time | Auxiliary space excluding copied output | Comment |
| --- | --- | --- | --- |
| Flatten then sort | `O(N log N)` | `O(N)` | Simple but ignores existing order. |
| Scan all current heads | `O(Nk)` | `O(k)` | Useful only when `k` is tiny. |
| Sequential two-list merge | Up to `O(Nk)` | `O(1)` if rewiring | Early lists may be scanned repeatedly. |
| Balanced pairwise merge | `O(N log k)` | Depends on iterative/recursive and copy policy | Good cache locality; easy to parallelize by round. |
| Min heap | `O(N log k)` | `O(k)` | Natural for streams and uneven list sizes. |

The heap and balanced pairwise solutions have the same asymptotic time. Choose based on streaming needs, node ownership, available parallelism, cache behavior, and implementation complexity—not asymptotics alone.

## Suggested API or interface

Java uses a `(value, sequence, node)` heap entry. The sequence makes ties deterministic because a priority queue otherwise need not preserve insertion order.

```java
PriorityQueue<Entry> heap = new PriorityQueue<>(
    Comparator.comparingInt(Entry::value).thenComparingLong(Entry::sequence));
while (!heap.isEmpty()) {
  Entry entry = heap.remove();
  tail.next = new ListNode(entry.node().value);
  tail = tail.next;
  if (entry.node().next != null) {
    heap.add(new Entry(entry.node().next.value, sequence++, entry.node().next));
  }
}
```

Python uses the same explicit tie-breaker so `heapq` never tries to compare node objects:

```python
sequence = count()
heap: list[tuple[int, int, ListNode]] = []
for node in lists:
    if node is not None:
        heappush(heap, (node.value, next(sequence), node))
while heap:
    _, _, node = heappop(heap)
    tail.next = ListNode(node.value)
    tail = tail.next
    if node.next is not None:
        heappush(heap, (node.next.value, next(sequence), node.next))
```

## Starter-to-solution checkpoints

1. Define `N` and `k`; avoid using `N` both per-list and globally.
2. Implement and test a two-list merge.
3. Compare sequential and balanced pairwise use of that primitive.
4. Identify the only candidates for the global minimum: the current list heads.
5. Put one head per non-empty list into a min heap.
6. Pop, append, and push one successor until the heap is empty.
7. Add a sequence tie-breaker and decide whether to copy or reuse nodes.
8. Explain how the same pattern merges sorted files one buffered record at a time.

## Java and/or Python implementation notes

Java `PriorityQueue` insertion and removal are logarithmic in heap size and the class is not synchronized. Python `heapq` represents the heap in a list; tuple ordering makes `(value, sequence, node)` convenient.

Validate the outer collection. Treat null heads as empty lists. The lab assumes each individual input is already sorted; validating all lists would add `O(N)` work and may be appropriate only at an untrusted boundary.

## Test cases and edge cases

- zero input lists;
- all heads null;
- one list, verifying the output is a copy;
- the three-list sample;
- duplicates within and across lists;
- negative values;
- lists with very unequal lengths;
- input snapshots proving `next` links were not changed;
- repeated equal values proving heap tie handling does not compare nodes.

For property tests, verify output length equals total input length, output is sorted, and the multiset of values is unchanged.

## Complexity and resource analysis

The heap holds at most `k` entries. Each of `N` nodes is inserted and removed once, so time is `O(N log k)` and heap space is `O(k)`. This lab additionally creates `N` output nodes, so its total new memory is `O(N + k)`. If nodes are safely reused, output allocation can be removed.

Balanced pairwise merge also processes every node once per `log k` round. A claim such as `O(N × k × log k)` usually mixes “nodes per list” and “total nodes”; define notation before calculating.

## Concurrency and failure behavior

The lab is local and single-threaded. Parallel pairwise rounds can use multiple cores, but synchronization, allocation pressure, and skewed list sizes may erase the benefit. A shared Java `PriorityQueue` is not thread-safe.

For sorted files or remote streams, keep one bounded buffer per input plus the heap. Apply backpressure to slow producers, checkpoint source offsets, write output atomically or to a versioned object, and resume without duplicating records. A malformed or out-of-order source needs an explicit quarantine or rejection policy.

## Production extension questions

- How do you merge terabyte-scale sorted files without loading them into memory?
- How does a limited file-descriptor budget change the fan-in per merge pass?
- When is pairwise parallel merge faster than a single heap?
- How would you preserve stable ordering for equal keys across sources?
- Can output stream before all inputs finish, and what watermark proves safety?
- What happens if one source pauses indefinitely or emits out-of-order data?
- How would you checkpoint and recover an external merge?

## Interview explanation checklist

- Define `N` total nodes and `k` lists.
- Compare at least the scan, pairwise, and heap approaches.
- Explain why only current heads belong in the heap.
- State `O(N log k)` time and separate heap space from output allocation.
- Name the input-ownership decision.
- Explain the deterministic tie-breaker.
- Connect the algorithm to external merge and bounded buffering.

## References

- [Java `PriorityQueue` documentation](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)
- [Python `heapq` documentation](https://docs.python.org/3/library/heapq.html)
