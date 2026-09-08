---
title: Production Agent Engineering Field Guide
domain: agentic-operations
topics: [aiops, agentic-operations, agent-security, opentelemetry, infrastructure-security]
published: 2026-09-08
tags: [agents, evaluation, observability, mcp, security, gpu]
---

## What to learn next

Your Kubernetes, distributed-systems and security background is a strong base. The next useful specialization is operating agents that can act reliably, with measurable outcomes and enforceable permissions.

Build one incident-triage agent across the following stages. Keep the same saved inputs throughout so improvements are comparable. These are suggested exercises, not completed labs.

| Stage | Engineering question | Evidence to keep |
| --- | --- | --- |
| 1. Execution | Can the workflow recover from a timeout without duplicating work? | State transitions, retry tests and an idempotency key |
| 2. Evaluation | Did the task actually succeed? | A versioned dataset of 20 incidents, expected outcomes and scoring rules |
| 3. Observability | Which model or tool call caused the failure or cost spike? | An end-to-end trace with tool spans and usage |
| 4. Security | Can hostile input cause an unauthorized tool action? | Injection tests, policy decisions and independent tool audit events |
| 5. Infrastructure | Can a compromised agent reach secrets or another tenant? | Egress-denial tests, identity boundaries and a deployment threat model |
| 6. Upgrade review | Did a model, prompt, tool or SDK change improve the system? | Before/after evaluation results and an adopt/defer decision |

## Build one complete agent before adding more agents

Use an explicit state machine: receive an incident, collect evidence, form a hypothesis, request any necessary approval, and return a report with citations. Start with read-only logs and metrics tools. Add timeouts, bounded retries, cancellation, idempotency and a maximum number of steps.

Choose one framework for the experiment. LangGraph and Pydantic AI are useful projects to investigate; framework churn should not force you to rewrite your evaluation dataset. Keep tool input/output contracts separate from orchestration code. Explore MCP when you need interoperable tool connections; it does not by itself grant safe authorization.

## Monitoring an agent's work

A server's healthy HTTP response does not prove that an agent completed its task. Monitor four different things:

| Layer | Signals | Example alert |
| --- | --- | --- |
| Task outcome | Verified success, incomplete tasks, unsupported claims, escalation rate | Success rate falls on the same evaluation set |
| Execution | Model/tool latency, errors, retries, repeated calls, queue time | Agent repeats a failing tool call beyond a configured bound |
| Cost | Input/output tokens, cached tokens where reported, tool cost, cost per successful task | Budget exceeded before the task completes |
| Security | Denied actions, approvals, identity used, unusual destinations, attempted secret access | Tool request reaches a forbidden destination |

Link task ID → trace ID → agent run → model call → tool call → external audit record. Record model, prompt, tool schema and evaluation versions so a regression can be reproduced. Use OpenTelemetry conventions where suitable, with a pinned convention version: GenAI conventions evolve and individual attributes have different stability levels.

Do not depend on a model's self-reported explanation as an authoritative audit log. Capture actual tool invocations and policy decisions in the tool gateway or execution layer. Redact prompts and outputs by default; collect content only with a documented purpose, access control and retention limit.

Automated visibility can combine application tracing, a tool gateway and workload signals. Network or eBPF telemetry can reveal connections and processes, but it cannot tell you whether an answer is correct. Outcome evaluation remains necessary.

## Security controls to practice

Treat retrieved documents, tool outputs and tool descriptions as untrusted inputs. Enforce permission checks in ordinary code outside the model. Give each execution scoped credentials, constrain outbound destinations, and require approvals for consequential actions.

Test goal hijacking, malicious tool output, memory poisoning, excessive permissions and approval bypass. Preserve independent audit events and demonstrate a kill switch. Use the existing AI Agent Security chapter as your starting point, then check its time-sensitive incident claims against primary reports before quoting them.

## Data-center security includes more than Kubernetes

Map separate trust boundaries for physical access, BMC/management networks, firmware and secure boot, hosts/hypervisors, GPUs, cluster control planes, workloads, storage and model artifacts. An application token must not become a route to the management plane.

Learn workload identity, image signing, secret rotation, network segmentation and runtime detection first. Then study GPU tenancy and memory isolation, confidential computing and remote attestation. Confidential computing addresses specific threats to data in use; it does not establish that a model or its authorized tool action is safe. Check the supported hardware, driver stack and threat model for any vendor claim.

## Keep up without becoming a full-time news reader

Daily, spend 15 minutes in AI Watch. Select one update and record the source, publication date, affected version and practical implication. Mark it as a release, draft specification, research claim or production guidance.

Weekly, reproduce one behavior in your lab and save the trace or test result. Monthly, rerun the same dataset across your current and candidate stack. Follow a few projects deeply: one orchestration framework, one telemetry/evaluation stack and one security enforcement path.

Use this note template:

```text
Date / source / publication date:
What changed and in which version:
Maturity (draft, experimental, stable):
Why it matters to my system:
Reproduction or experiment:
Measured outcome:
Decision (adopt, experiment, defer):
Review trigger:
```

## References

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OWASP Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/)
- [MCP security best practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [Pydantic AI](https://github.com/pydantic/pydantic-ai)
- [Langfuse](https://github.com/langfuse/langfuse)
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)
- [NVIDIA confidential computing overview](https://developer.nvidia.com/blog/protecting-sensitive-data-and-ai-models-with-confidential-computing/)
