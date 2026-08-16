---
title: Bounded Producer–Consumer Queue
summary: Build a bounded work queue with clear timeout and shutdown semantics, then explain its backpressure behavior.
order: 4
difficulty: intermediate
estimatedMinutes: 90
categories: [coding, concurrency, reliability]
languages: [java, python]
skills: [concurrency, backpressure, queues, shutdown]
labPath: coding-labs/bounded-producer-consumer
status: planned
tags: [threads, workload-control, backend]
---

Runnable code will live in [coding-labs/bounded-producer-consumer](../../coding-labs/bounded-producer-consumer/).

## Interview prompt

Implement a bounded queue that blocks or times out when full/empty and wakes all waiters during shutdown. The senior question is: how do you make overload visible and controlled rather than silently accumulating memory?

## What you will build

Build `offer(item, timeout)` and `poll(timeout)` plus `close()`. Producers receive a result instead of blocking forever; consumers finish cleanly after close and drain. Production extension: worker pools, cancellation, and queue-depth telemetry.

## Requirements and constraints

Capacity must be positive. Preserve FIFO order. Handle spurious wakeups. Never hold a lock while processing an item. Define whether close drops queued work; this lab drains it before returning closed.

## Suggested API or interface

`boolean offer(T item, Duration timeout)`, `PollResult<T> poll(Duration timeout)`, and `void close()`. Python can return `(status, item)` where status is `item`, `timeout`, or `closed`.

## Starter-to-solution checkpoints

1. Implement FIFO storage under one lock.
2. Add `notFull` and `notEmpty` conditions.
3. Loop around condition waits and honor a deadline.
4. Add idempotent close that signals all waiters.
5. Instrument wait time and rejected offers.

## Java and/or Python implementation notes

Use `ReentrantLock`/`Condition` or `threading.Condition`; standard queue helpers are useful only if their shutdown semantics remain explicit. Compute a deadline once to resist spurious wakeups.

## Test cases and edge cases

Test FIFO ordering, full-queue timeout, empty-queue timeout, one producer/consumer handoff, close while producer waits, close while consumer waits, repeated close, and draining work after close.

## Complexity and resource analysis

Enqueue/dequeue are O(1), storage is O(capacity), and waiting is externally bounded by timeout. Explain why unbounded queues turn downstream slowness into memory pressure and latency.

## Concurrency and failure behavior

All queue state and closed state share one synchronization boundary. Interrupted waits must restore interruption or return a documented failure. A crashed consumer leaves work unprocessed; a durable queue is a separate production concern.

## Production extension questions

When should callers shed load versus retry? How do you allocate capacity among priorities? What drain deadline is safe during a rolling deployment?

## Interview explanation checklist

- State FIFO, capacity, and close semantics.
- Explain condition-loop use.
- Identify backpressure at `offer`.
- Discuss interruption and shutdown.
- Contrast memory queue with durable messaging.

## References

- [Java `Condition` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Condition.html)
- [Python `threading.Condition`](https://docs.python.org/3/library/threading.html#condition-objects)
