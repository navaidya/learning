---
title: Microservice Observability and Failure Lab
summary: Build a framework-neutral request pipeline that records useful signals through timeouts, dependency failures, and recovery.
order: 8
difficulty: advanced
estimatedMinutes: 120
categories: [microservices, reliability, concurrency]
languages: [java, python]
skills: [observability, timeouts, tracing, metrics, failure-modeling]
labPath: coding-labs/microservice-observability-failure-lab
status: ready
tags: [SRE, telemetry, microservices]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Implement a request pipeline that calls a dependency with a deadline and emits structured events, latency metrics, and outcome counters. The senior question is: what evidence lets an on-call engineer distinguish a deadline timeout, dependency outage, and slow recovery? Caller cancellation propagation is a production follow-up rather than a behavior modeled by this local lab.

## What you will build

Build a small service facade with injected clock, dependency, and telemetry sink. It returns a typed success, timeout, or dependency-failure result and emits correlated telemetry. Production extension: OpenTelemetry integration, sampling, and SLO alerting.

## Requirements and constraints

Every event includes request ID, outcome, duration, and dependency name; do not put secrets or high-cardinality user data in metric labels. A timeout has a defined deadline. The core is framework-neutral and does not send real network requests.

## Suggested API or interface

`Response handle(Request request, Deadline deadline)` with `Dependency.call(request, deadline)` and `Telemetry.record(Event)`. Emit `request_started`, `dependency_result`, and `request_finished` with a shared correlation ID.

## Starter-to-solution checkpoints

1. Return a successful dependency result with one finish event.
2. Measure duration from an injected monotonic clock.
3. Classify dependency failure and timeout separately.
4. Record metrics from stable dimensions only.
5. Add a recovery sequence and use signals to explain it.

## Java and/or Python implementation notes

Use immutable event objects and a test sink that records them in memory. Model timeout as a dependency result or deterministic elapsed time rather than an actual thread interrupt. Keep logs, metrics, and traces conceptually distinct.

### Framework adapter discussion

A Spring Boot adapter can use a controller plus constructor-injected dependency client and telemetry facade, carrying the request deadline from HTTP metadata into the framework-neutral pipeline. A FastAPI adapter can use typed request models and `Depends` providers for the dependency and telemetry sink. Keep timeout/error classification in the core, persistence only for durable audit needs, and OpenTelemetry export at the adapter boundary so telemetry failure never changes the HTTP outcome.

## Test cases and edge cases

Test success, dependency exception, deadline exceeded, a repeated request with distinct IDs, missing correlation ID rejection, telemetry-sink failure isolation, and recovery after a dependency becomes healthy. Ensure no secret payload appears in emitted fields.

## Complexity and resource analysis

Local processing is O(1) per request plus bounded event creation. Telemetry volume can dominate at scale; use sampling and aggregation deliberately. Cardinality grows with label choices, not request rate alone.

## Concurrency and failure behavior

Request state is per invocation; shared sinks must be thread-safe or buffered with bounded backpressure. Telemetry must not make the user request fail. During collector outage, retain a bounded buffer or drop with a counter according to policy.

## Production extension questions

Which RED/USE-style signals support the SLO? How do trace context and log correlation cross async boundaries? What sampling rule preserves rare failures while controlling cost?

## Interview explanation checklist

- Define outcome taxonomy and deadline behavior.
- List the minimum useful event fields.
- Separate logs, metrics, and traces.
- Explain cardinality and telemetry-failure isolation.
- Describe the signals used to detect recovery.

## References

- [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/)
- [Google SRE book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
