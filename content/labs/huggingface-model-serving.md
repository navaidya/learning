---
title: Serve a Hugging Face Model on Kubernetes
domain: machine-learning
difficulty: intermediate
status: in_progress
completed: false
topics: [huggingface, model-serving, helm, kubernetes, observability]
---
# Serve a Hugging Face Model on Kubernetes

## Objective

Deploy a small open-weights model behind a production-style inference server, using the same rigor (Helm, resource limits, metrics, load test) as any other microservice — and measure its actual serving behavior rather than just getting it to respond once.

## Setup

- Pick a small model (distilled or ~1–3B parameters) with a permissive license; pin the exact revision hash, not `main`.
- Run **Text Generation Inference (TGI)** or **vLLM** locally in Docker first to confirm the model loads and generates before touching Kubernetes.
- A local `kind`/`minikube` cluster is enough; GPU is optional — CPU inference is slower but the operational lessons (probes, metrics, load behavior) transfer either way.

## Task

1. Write a Helm chart (or values for a generic inference chart) parameterizing: model name + revision, GPU/CPU resource requests and limits, quantization mode, and replica/autoscaling thresholds.
2. Deploy to the cluster with a readiness probe that tolerates multi-minute model load time and a liveness probe that doesn't fire during a long generation.
3. Expose and scrape the server's native `/metrics` endpoint (TGI and vLLM both ship Prometheus metrics) with a ServiceMonitor.
4. Run a k6 (or similar) load test against the inference endpoint at increasing concurrency.

## Commands

```bash
# local sanity check before Kubernetes
docker run --rm -p 8080:80 ghcr.io/huggingface/text-generation-inference:latest \
  --model-id <org>/<model>@<revision>

curl 127.0.0.1:8080/generate -X POST \
  -H 'Content-Type: application/json' \
  -d '{"inputs":"Explain readiness probes in one sentence.","parameters":{"max_new_tokens":40}}'
```

```bash
helm install hf-serve ./charts/hf-serve -f values-local.yaml
kubectl get pods -w
kubectl port-forward svc/hf-serve 8080:80
```

## Expected observation

- Time-to-first-token and tokens/sec, measured directly rather than assumed.
- GPU/CPU and memory utilization under load, and where the server starts queuing or rejecting requests.
- Whether the readiness probe correctly gates traffic during model load, and whether the liveness probe stays quiet during a long-running generation.

## Success criteria

- [ ] Chart deploys cleanly with pinned model revision as a value, not hardcoded.
- [ ] Readiness probe passes only after the model is actually loaded and able to serve.
- [ ] `/metrics` is scraped by Prometheus and tokens/sec + time-to-first-token are visible on a dashboard.
- [ ] A k6 run at increasing concurrency shows where latency/queueing degrades, with numbers recorded here.
- [ ] One paragraph on what would need to change to run this safely in production (autoscaling signal, PodDisruptionBudget, revision pinning/verification, rollback plan).

## Lessons learned

_To fill in after running the lab._
