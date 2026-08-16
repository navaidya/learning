---
title: Idempotent Order API
summary: Model safe duplicate handling for a write endpoint without pretending an in-memory exercise is a complete payments system.
order: 6
difficulty: advanced
estimatedMinutes: 105
categories: [coding, microservices, reliability]
languages: [java, python]
skills: [idempotency, state-machines, API-design, consistency]
labPath: coding-labs/idempotent-order-api
status: planned
tags: [orders, APIs, distributed-systems]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Implement a local order-creation service keyed by an idempotency key. The same key and equivalent request replay the first result; the same key with different payload is rejected. The senior question is: how do you distinguish safe retries from conflicting intent?

## What you will build

Build `createOrder(request, idempotencyKey)` with an in-memory repository and explicit states. It returns the original order for a duplicate. Production extension: database uniqueness, request fingerprints, and retention policy.

## Requirements and constraints

Require a non-blank key and validated request. Canonicalize or fingerprint the relevant payload before storing it. Do not create two orders for one key. This lab models local core behavior only; payment authorization and HTTP deployment are outside scope.

## Suggested API or interface

`CreateOrderResult create(OrderRequest request, String idempotencyKey)`. Results distinguish `created`, `replayed`, `conflict`, and `invalid`. Include an immutable `Order(id, fingerprint, status)`.

## Starter-to-solution checkpoints

1. Validate a request and allocate one order.
2. Store key-to-record atomically with the result.
3. Replay a matching fingerprint.
4. Reject a changed fingerprint for the same key.
5. Add concurrent callers and a repository-level uniqueness boundary.

## Java and/or Python implementation notes

Keep fingerprinting deterministic and explain which fields are intentionally excluded. In-memory locking demonstrates the critical section but is not a multi-instance solution. Make generated IDs injectable for repeatable tests.

## Test cases and edge cases

Test valid creation, identical duplicate replay, conflicting duplicate, blank key, invalid amount, a retry after a simulated response loss, and concurrent same-key requests. Verify only one stored order exists.

## Complexity and resource analysis

Lookup and insert are O(1) average in memory; retained key records consume O(number of keys). Production storage needs a TTL chosen to cover real client retry horizons and audit requirements.

## Concurrency and failure behavior

The local linearization point stores fingerprint and result together. If a process crashes after side effects but before durable storage, replay safety is lost; production requires a transaction or a durable state machine around external effects.

## Production extension questions

How do you implement uniqueness across regions? How do clients recover an in-progress response? Which fields should participate in fingerprinting, and how do you protect idempotency keys from enumeration?

## Interview explanation checklist

- Define duplicate versus conflict.
- Show the key/fingerprint/result record.
- Identify the atomic storage boundary.
- Explain crash gap limitations.
- Contrast local demonstration with durable API deployment.

## References

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
