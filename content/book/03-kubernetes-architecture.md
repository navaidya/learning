---
title: Kubernetes Architecture
domain: kubernetes
topic: architecture
status: learning
importance: high
coverage: 72
confidence: 4
last_reviewed: 2026-08-08
tags: [control-plane, workloads]
---
# Kubernetes Architecture

Kubernetes separates a control plane that makes scheduling and reconciliation decisions from nodes that run workloads. The API server is the system boundary: clients, controllers, schedulers, and operators communicate through it.

## Core control-plane components

- **API server:** authenticates requests and persists the resource model.
- **etcd:** durable key-value storage for cluster state.
- **Scheduler:** assigns unscheduled Pods to suitable nodes.
- **Controllers:** continuously reconcile desired and observed state.

## Study connection

Use the [troubleshooting guide](./03-kubernetes-troubleshooting) when a workload does not reach its desired state.
