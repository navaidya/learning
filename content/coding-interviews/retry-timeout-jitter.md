---
title: Retry, Timeout, and Jitter Policy
summary: Build a retry policy that protects a dependency instead of multiplying an outage through blind repetition.
order: 5
difficulty: intermediate
estimatedMinutes: 75
categories: [coding, reliability]
languages: [java, python]
skills: [retries, timeouts, jitter, error-classification]
labPath: coding-labs/retry-timeout-jitter
status: ready
tags: [resilience, distributed-systems, backend]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Build a policy that invokes an operation with a maximum attempt and elapsed-time budget. Retry only retryable failures and calculate jittered backoff without real sleeps. The senior question is: how do retries change load and correctness during an outage?

## What you will build

Build `execute(operation)` with injected clock, sleeper, and random source. The result captures attempts and final outcome. Production extension: per-dependency budgets, circuit breaking, and request cancellation propagation.

## Requirements and constraints

Bound both attempts and total time. Classify caller errors as non-retryable. Do not retry an operation unless its idempotency is known. Respect a caller deadline; a retry must not start when the remaining budget cannot cover it.

## Suggested API or interface

`Result<T> execute(Callable<T> operation)` with `RetryPolicy(maxAttempts, maxElapsed, baseDelay, maxDelay)`. Python can accept `Callable[[], T]`, a fake `sleep`, `now`, and `random_unit` seam.

## Starter-to-solution checkpoints

1. Return after the first success or permanent error.
2. Add a fixed attempt limit.
3. Add exponential delay capped at a maximum.
4. Add deterministic full jitter using an injected random value.
5. Stop before violating the elapsed-time budget.

## Java and/or Python implementation notes

Represent failures with explicit retryable/non-retryable classes rather than matching message text. The operation owns its per-attempt timeout in this local lab; describe how a real client would receive the remaining deadline.

## Test cases and edge cases

Test immediate success, success after one retry, permanent failure, exhausted attempts, capped delay, zero remaining budget, repeated retryable failure, and a fake sleeper receiving the expected jittered delays.

## Complexity and resource analysis

CPU overhead is O(attempts), while added latency is the sum of bounded delays and attempt timeouts. The real cost is amplified dependency load: retries can turn one failing request into many.

## Concurrency and failure behavior

The policy is immutable and can be shared; per-execution attempt state is local. Interrupted sleeps and cancellation should stop retries. When errors become systemic, retries must yield to a circuit breaker or load shedding policy.

## Production extension questions

Which HTTP/status failures are safe to retry? Where do idempotency keys fit? How would you coordinate retry budgets across a fleet and expose retry amplification in metrics?

## Interview explanation checklist

- Start with idempotency and deadlines.
- Separate permanent from transient errors.
- Explain capped exponential backoff and jitter.
- State both time and attempt bounds.
- Describe overload protection beyond retries.

## References

- [Google SRE book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Java `Duration` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Duration.html)
