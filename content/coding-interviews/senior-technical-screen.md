---
title: Senior Engineering Technical Screen
summary: Build concise, evidence-backed answers about engineering judgment, secure code, API design, and large-scale architecture—then demonstrate those principles in a runnable service operation.
order: 9
difficulty: advanced
estimatedMinutes: 90
categories: [communication, coding, architecture]
languages: [java, python]
skills: [technical-storytelling, secure-coding, api-design, architecture-reasoning, idempotency]
labPath: coding-labs/senior-technical-screen
status: ready
tags: [senior-engineer, technical-screen, service-design, interview-rubric]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Prepare for a twenty-minute senior technical screen with four five-minute conversations:

1. **Your area of depth:** What do you know unusually well, and where did that knowledge change an outcome?
2. **Programming practice:** How do you make code correct, secure, maintainable, testable, and operable?
3. **API design:** What makes an API safe and pleasant for both consumers and operators?
4. **Architecture:** How do you move from requirements to a large-scale design and defend its trade-offs?

The interviewer is not looking for the longest vocabulary list. A strong answer connects a principle to a decision, evidence, and consequence. Use this pattern: **context → constraint → choice → trade-off → measured result → lesson**.

### Depth signals

| Signal | What it sounds like |
| --- | --- |
| Developing | Names a sound technique and can implement it correctly. |
| Senior | Selects among alternatives, explains failure modes, writes tests, and connects code to operations. |
| Staff-level | Frames ambiguous scope, identifies cross-team risks, evolves the architecture, and uses evidence to change organizational decisions. |

Keep your examples truthful. Replace “I built a scalable service” with the relevant scale, your personal decision, the alternative rejected, and the production result.

## What you will build

Build a small idempotent command handler in Java and Python. It validates an operation, creates one resource per request ID, returns the original resource for a duplicate, rejects conflicting reuse, and permits a retry after dependency failure.

This compact example supports several interview themes at once:

- boundary validation prevents malformed state;
- immutable commands and results reduce accidental mutation;
- idempotency makes retries safe;
- injected persistence separates policy from mechanism;
- a local synchronization boundary makes the concurrency claim explicit;
- failed persistence is never cached as success.

The lab is not a distributed idempotency implementation. Multiple service replicas would require a durable unique key and an atomic write in shared storage.

## Requirements and constraints

### Programming and secure-coding principles

| Principle | Practical meaning |
| --- | --- |
| Correctness first | Define the contract, invariants, and failure behavior before optimizing. |
| Least privilege | Give code and identities only the capabilities required for the operation. |
| Validate at trust boundaries | Normalize and validate untrusted input before it influences state, queries, paths, or logs. |
| Fail safely | Return deliberate errors; do not expose secrets, payloads, stack traces, or dependency internals. |
| Make invalid state difficult | Use constrained types, immutable values, and constructors that enforce invariants. |
| Prefer simple designs | Apply KISS and YAGNI; abstraction must remove real duplication or isolate volatility. |
| Test behavior | Cover success, absence, malformed input, boundaries, concurrency, and dependency failure. |
| Design for operations | Emit useful metrics, traces, logs, request IDs, and actionable alerts without sensitive data. |

SOLID is a diagnostic vocabulary, not a goal by itself. For example, dependency inversion helps this lab replace a repository without changing idempotency policy; creating five interfaces for a ten-line pure function would not improve it.

### Good API checklist

Start with the consumer’s task and specify:

- resource and operation semantics;
- request validation and size limits;
- authentication separately from authorization;
- idempotency and retry behavior;
- stable error shapes and machine-readable codes;
- pagination, filtering, ordering, and rate limits;
- compatibility and version-evolution policy;
- timeouts, cancellation, observability, and deprecation.

For HTTP, understand which method semantics are defined as safe or idempotent, but do not assume a method name alone makes the implementation retry-safe. A create operation can accept an idempotency key and enforce it durably.

### Architecture answer checklist

Clarify functional requirements and non-functional targets first. Estimate traffic and data. Draw the request path and asynchronous paths. Assign ownership of state, choose consistency deliberately, then examine overload, dependency loss, regional failure, security, privacy, deployment, observability, and evolution.

For a SaaS follow-up, include tenant identity, data isolation, quotas, noisy-neighbor protection, encryption boundaries, configuration, metering, upgrades, support access, and tenant-aware observability. For on-premises migration, begin with discovery and dependency mapping; choose rehost, replatform, refactor, retain, replace, or retire per workload, and plan data movement, coexistence, rollback, and operating-model changes. For a data platform, separate ingestion, durable storage, schema/catalog, batch/stream processing, serving, governance, quality, lineage, and cost controls.

## Suggested API or interface

Java uses immutable records and a repository interface:

```java
public record Command(String requestId, String payload) {}
public record Result(String resourceId, Status status) {}

public synchronized Result handle(Command command) {
  String requestId = normalize(command.requestId(), "requestId");
  String payload = normalize(command.payload(), "payload");
  Stored existing = completed.get(requestId);
  if (existing != null) {
    if (!existing.payload().equals(payload)) throw new IllegalStateException("conflicting request");
    return new Result(existing.resourceId(), Status.REPLAYED);
  }
  String resourceId = repository.create(payload);
  completed.put(requestId, new Stored(payload, resourceId));
  return new Result(resourceId, Status.CREATED);
}
```

Python exposes the same observable contract:

```python
def handle(self, command: Command) -> Result:
    request_id = self._normalize(command.request_id, "request_id")
    payload = self._normalize(command.payload, "payload")
    with self._lock:
        existing = self._completed.get(request_id)
        if existing is not None:
            stored_payload, resource_id = existing
            if stored_payload != payload:
                raise RuntimeError("conflicting request")
            return Result(resource_id, Status.REPLAYED)
        resource_id = self._repository(payload)
        self._completed[request_id] = (payload, resource_id)
        return Result(resource_id, Status.CREATED)
```

In both implementations, persistence happens before the success record is stored. An exception therefore leaves the request retryable.

## Starter-to-solution checkpoints

1. Write a two-minute expertise introduction using context, evidence, impact, and lesson.
2. Explain three programming principles through concrete code decisions—not definitions alone.
3. Design the command contract and state the normalization policy.
4. Write the duplicate and conflict tests before the handler.
5. Add the dependency-failure test and ensure failure is not cached.
6. Add simultaneous duplicate calls and identify exactly what the lock protects.
7. Explain how durable uniqueness replaces the local lock in a multi-instance service.
8. Practice the four interview sections against a twenty-minute timer.

## Java and/or Python implementation notes

Java’s `synchronized` method makes lookup, persistence, and recording one local critical section. Python uses `threading.Lock` around the same state transition. This is easy to reason about but serializes unrelated request IDs. A production implementation could reduce contention with a database uniqueness constraint on `(tenant_id, request_id)`, transactional result storage, and careful handling of in-progress operations.

Do not log the payload on conflict. Treat request IDs as untrusted input, bound their length in a service adapter, and prevent one tenant from observing another tenant’s key.

## Test cases and edge cases

| Case | Expected behavior |
| --- | --- |
| First valid command | Persist once and return `CREATED`. |
| Same normalized ID and payload | Return the same resource with `REPLAYED`. |
| Same ID, different payload | Reject as a conflict without a second write. |
| Blank ID or payload | Reject before calling the repository. |
| Repository throws | Propagate a sanitized service error; do not cache success. |
| Retry after failure | Attempt persistence again and return `CREATED` if it succeeds. |
| Concurrent identical commands | One local create and deterministic replays. |

## Complexity and resource analysis

The in-memory lookup is expected `O(1)` time and stored state is `O(u)` for `u` unique request IDs. The local lock limits throughput because persistence occurs inside the critical section. Production storage needs a retention policy: keeping every idempotency record forever creates unbounded growth, while deleting one too early permits an old retry to create a duplicate.

## Concurrency and failure behavior

State the linearization point: in the lab it is the synchronized repository call and subsequent map insertion. In a real service it should be a durable conditional insert or transaction. Plan for client timeout after the server commits, process death between business write and response, duplicated messages, storage unavailability, and retries arriving in different regions.

Return stable error categories such as invalid request, conflict, unavailable dependency, and internal failure. Keep diagnostic detail in access-controlled telemetry and redact sensitive fields.

## Production extension questions

- How would you partition idempotency records by tenant and prevent hot keys?
- How long should records live, and what establishes the maximum retry window?
- How do you make the business write and idempotency result atomic?
- How would your API evolve without breaking old clients?
- When should a SaaS tenant receive a dedicated data plane?
- How would you migrate this service from on-premises infrastructure with rollback?
- Which SLOs, traces, metrics, and security events establish operational readiness?

## Interview explanation checklist

- Give an evidence-backed expertise story in under two minutes.
- Explain correctness, security, maintainability, tests, and operations through examples.
- Separate authentication, authorization, validation, idempotency, and rate limiting.
- Begin architecture with requirements and estimates, not products.
- Name the local concurrency guarantee and its distributed limitation.
- Discuss at least one rejected alternative and the condition that would change your choice.
- Close with measurable results or the metrics you would collect.

## References

- [OWASP API Security Project](https://owasp.org/API-Security/)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Python `threading` documentation](https://docs.python.org/3/library/threading.html)
