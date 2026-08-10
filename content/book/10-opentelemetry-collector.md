---
title: OpenTelemetry Collector
domain: opentelemetry
topic: collector
status: learning
importance: critical
coverage: 35
confidence: 2
---
# OpenTelemetry Collector

The collector receives telemetry through receivers, transforms it with processors, and delivers it through exporters. Pipelines make each signal’s path explicit and testable.

## A safe pipeline

Start with a narrow receiver and exporter, add batching, and monitor queue capacity and export errors before increasing throughput.
