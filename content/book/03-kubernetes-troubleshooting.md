---
title: Kubernetes Troubleshooting
domain: kubernetes
topic: troubleshooting
status: practicing
importance: high
coverage: 55
confidence: 3
labs_completed: 1
labs_required: 3
---
# Kubernetes Troubleshooting

Troubleshooting starts by identifying the first failing boundary: scheduling, image retrieval, container startup, readiness, service discovery, or external dependency.

## CrashLoopBackOff workflow

Inspect events and logs, compare the container command with its image, and verify configuration and mounted secrets. The status is a symptom of repeated process termination, not a root cause.

```bash
kubectl describe pod example
kubectl logs example --previous
```
