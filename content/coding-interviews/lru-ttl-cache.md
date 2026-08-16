---
title: LRU Cache with TTL
summary: Design a bounded in-memory cache that makes expiry and eviction testable instead of relying on wall-clock luck.
order: 2
difficulty: intermediate
estimatedMinutes: 75
categories: [coding, reliability]
languages: [java, python]
skills: [caching, LRU, TTL, testability, clocks]
labPath: coding-labs/lru-ttl-cache
status: planned
tags: [cache, backend, state]
---

Runnable code will live in [coding-labs/lru-ttl-cache](../../coding-labs/lru-ttl-cache/).

## Interview prompt

Implement a fixed-capacity key/value cache where reads refresh recency and expired values are never returned. The senior question is: which concerns belong in the local data structure, and which become distributed-cache policy in production?

## What you will build

Build `put(key, value, ttl)` and `get(key)` with an injectable monotonic clock. A successful `get` promotes an unexpired key; inserting above capacity evicts the least-recently used live key. Production extension: cache-aside loading with stampede protection.

## Requirements and constraints

Capacity must be positive. TTL must be non-negative and expiry must be deterministic in tests. Misses return an explicit optional value, not a cached null by accident. Expired entries may be removed lazily on access for the core lab.

## Suggested API or interface

`Optional<V> get(K key)`, `void put(K key, V value, Duration ttl)`, and `int size()`. Python can use `get(key) -> V | None`, `put(key, value, ttl_ms)`, and an injected `now_ms()` callable.

## Starter-to-solution checkpoints

1. Implement bounded LRU without expiry.
2. Add an entry expiry timestamp from an injected clock.
3. Remove expired values before treating a read as a hit.
4. Test capacity, overwrite, expiry, and recency separately.
5. Discuss eager cleanup only after correctness is established.

## Java and/or Python implementation notes

Java may use access-ordered `LinkedHashMap`; Python may use `OrderedDict` or ordered `dict` operations. Keep clock reads behind a tiny interface so tests advance a fake clock. Avoid real sleeps.

## Test cases and edge cases

Test zero capacity rejection, missing keys, overwritten keys, TTL zero, exact expiry boundary, an LRU eviction after a read, and repeated expired reads. Verify a value cannot reappear after expiry.

## Complexity and resource analysis

Core reads and writes are O(1) average time and O(capacity) space. Lazy expiry can retain dead entries until touched; explain the memory/CPU trade-off of a sweeper or expiry min-heap.

## Concurrency and failure behavior

Protect compound read-expire-promote operations with a lock or a single-threaded owner. Do not call a loader while holding that lock. A process restart loses this cache by design; callers must tolerate misses.

## Production extension questions

How do you prevent a hot-key stampede? Should TTL include jitter? How do versioned values and invalidation events affect stale reads across cache nodes?

## Interview explanation checklist

- Separate eviction from expiry.
- Explain the injected monotonic clock.
- Trace recency after a `get`.
- State O(1) average cost and lazy-expiry caveat.
- Identify the lock boundary and restart behavior.

## References

- [Java `LinkedHashMap` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html)
- [Python `collections.OrderedDict`](https://docs.python.org/3/library/collections.html#collections.OrderedDict)
