---
title: Diagnose CrashLoopBackOff
domain: kubernetes
difficulty: beginner
status: completed
completed: true
completed_date: 2026-08-05
topics: [pods, troubleshooting]
---
# Diagnose CrashLoopBackOff

## Objective

Identify why a container repeatedly exits and distinguish symptoms from root cause.

## Setup

Create a Pod whose command exits non-zero.

## Task

Inspect events, current logs, previous logs, and the rendered Pod specification.

## Commands

```bash
kubectl get pod demo
kubectl describe pod demo
kubectl logs demo --previous
```

## Expected observation

The previous container logs contain the failure message and the event stream shows restarts.

## Investigation and solution

Correct the command or configuration that causes the process to exit, then verify the Pod becomes Ready.

## Lessons learned

`CrashLoopBackOff` describes restart backoff; it does not identify the application failure.
