---
title: Token Bucket Rate Limiter
summary: Build a deterministic admission controller and reason about atomicity, fairness, and distributed limits.
order: 3
difficulty: intermediate
estimatedMinutes: 75
categories: [coding, concurrency, reliability]
languages: [java, python]
skills: [rate-limiting, synchronization, clocks, API-contracts]
labPath: coding-labs/token-bucket-rate-limiter
status: planned
tags: [traffic-control, resilience, backend]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Implement `tryAcquire(cost)` for a bucket with a capacity and a refill rate. It must never admit more tokens than available, even under concurrent callers. The senior question is: where is the atomic decision boundary, and what does “fair” mean for this product?

## What you will build

Build an in-process limiter backed by an injectable monotonic clock. It reports allowed/denied plus retry-after information. Production extension: a partitioned, shared limit keyed by tenant or API credential.

## Requirements and constraints

Reject non-positive request costs and invalid capacity/rates. Refill only from elapsed monotonic time, clamp at capacity, and do not refill on wall-clock rollback. Separate the limit key from authentication; this lab is not an auth system.

## Suggested API or interface

`Decision tryAcquire(int cost)` where `Decision` has `allowed`, `remainingTokens`, and `retryAfterMillis`. Construct with `capacity`, `tokensPerSecond`, and `Clock`/`nowNanos`.

## Starter-to-solution checkpoints

1. Model tokens as a fractional number with a fake clock.
2. Refill and clamp before every decision.
3. Deduct only when enough tokens exist.
4. Make refill-plus-deduct one atomic critical section.
5. Add a keyed limiter and bounded key lifecycle discussion.

## Java and/or Python implementation notes

Use a lock around mutable bucket state; do not rely on separate atomic fields. A floating-point representation is acceptable with explicit rounding in the public result. Inject time and never sleep in tests.

## Test cases and edge cases

Test initial burst capacity, empty-bucket denial, partial refill, cap clamping, invalid input, repeated denial, and parallel acquisitions that cannot exceed the initial token total. Test exact retry-after rounding.

## Complexity and resource analysis

One bucket uses O(1) time and space per decision. A keyed limiter uses O(number of active keys); idle-key expiry must be bounded to avoid a memory-abuse vector.

## Concurrency and failure behavior

The linearization point is inside the synchronized refill-and-debit operation. On process restart, local state resets and may allow a burst. A shared store must define availability versus strictness during outages.

## Production extension questions

Would you prefer local fail-open or fail-closed behavior? How do you prevent noisy tenants from dominating a shared Redis shard? How can per-user and global limits compose without double charging?

## Interview explanation checklist

- Define capacity, refill, and burst behavior.
- Identify the atomic decision point.
- Explain fake monotonic time.
- Give O(1) per-bucket cost.
- Contrast local and distributed enforcement.

## References

- [Java `System.nanoTime`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/System.html#nanoTime())
- [Python `time.monotonic`](https://docs.python.org/3/library/time.html#time.monotonic)
