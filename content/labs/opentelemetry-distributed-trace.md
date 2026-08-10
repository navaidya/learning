---
title: Follow a Distributed Trace
domain: opentelemetry
difficulty: beginner
status: completed
completed: true
completed_date: 2026-08-10
topics: [traces, collector]
---
# Follow a Distributed Trace

## Objective

Trace one request across two services and inspect its context propagation.

## Setup

Run two instrumented services and an OpenTelemetry Collector with a console exporter.

## Task

Send a request, find its trace ID, and follow parent/child spans.

## Commands

```bash
curl http://localhost:8080/order
```

## Expected observation

The collector shows one trace containing spans from both services.

## Investigation, solution, and lessons learned

Missing parent context creates disconnected traces. Verify propagation headers and SDK configuration before changing sampling.
