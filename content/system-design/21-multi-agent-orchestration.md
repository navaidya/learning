---
title: AI-Native Multi-Agent Orchestration Platform
summary: A platform for running multi-step, multi-agent AI workloads with tool sandboxing, context handoff, loop detection, and human approval gates for irreversible actions.
order: 22
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Reliably decomposing and executing long-running multi-agent tasks without runaway loops, cost blowups, or unsafe tool calls
aiFocus: [task decomposition and routing, tool-call sandboxing, context window management, loop and cost watchdogs]
tags: [agents, orchestration, llm-infrastructure, tool-use]
---

_Follows the [System Design Template](../00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a platform that accepts a high-level task, decomposes it across specialized agents, routes tool calls safely, hands context between agents, and terminates runaway or looping agent runs deterministically — without a stuck LLM call ever becoming a stuck production incident.

## 2. Requirements and scope

### Functional requirements

| ID | Requirement | Priority | Interview significance |
|---|---|---|---|
| FR-1 | The system must submit, pause, resume, cancel, and inspect a durable agent workflow. | Must | Defines the authoritative synchronous command boundary and its invariants. |
| FR-2 | The system must stream workflow state, approvals, artifacts, costs, and audit history. | Must | Defines the dominant read path, caches, indexes, and acceptable staleness. |
| FR-3 | The system must schedule isolated steps, invoke models and tools, checkpoint state, and evaluate outcomes. | Must | Separates durable acceptance from retryable fan-out and derived work. |
| FR-4 | The system must manage tenants, tool policy, budgets, model routes, approvals, and incident replay. | Should | Requires versioned configuration, least privilege, audit, and rollback. |

### Non-functional requirements

| Quality | Measurable target | Why it matters | Architecture consequence |
|---|---|---|---|
| Latency | workflow acceptance p99 below 500 ms while step latency is deadline-bound by tool policy | Users experience this path directly. | Keep the critical path local, bounded, and independently scalable. |
| Availability | durable workflows resume after worker or region failure without duplicate unsafe side effects | A partial infrastructure failure must have an explicit outcome. | Spread workloads across failure zones and define degradation before failover. |
| Correctness | idempotent step epochs, approval gates, budget limits, and tool authorization cannot be bypassed | The system is not useful if its central invariant can be violated. | Use idempotency, ownership epochs, transactions, leases, or version checks where required. |
| Peak scale | run millions of heterogeneous long-lived workflows with bursty model and tool usage | Peak traffic and skew determine partitions and isolation. | Partition by the domain ownership key, autoscale on work, and reserve burst headroom. |
| Security and privacy | sandbox workers, isolate tenants, broker credentials, validate untrusted tool output, and prevent prompt injection | Abuse or data disclosure can outweigh availability. | Authenticate at the edge, authorize at the data boundary, encrypt, minimize, and audit. |

**Scope exclusions:** giving models unrestricted network or credential access and guaranteeing deterministic model text. **Assumptions:** workflow state is authoritative, side effects use idempotency keys, and humans approve high-impact actions.

## 3. Capacity estimate

At 50k task submissions/day averaging 4 subagents per lead run and 15 tool calls per subagent, that is roughly 3M tool calls/day, or 35/s average with 5-10x bursts around business hours. Multi-agent runs are token-heavy — Anthropic's own multi-agent research system reports roughly 15x the token consumption of single-agent chat for comparable tasks — so budget accordingly: at 3M tool calls/day and ~2k tokens of context per call amortized, that's on the order of billions of tokens/day, making per-run token budgets and context compaction first-order cost concerns, not afterthoughts. Run state (plan, transcript, tool results) for a typical multi-agent task is 1-5 MB; at 50k runs/day with 30-day retention that's tens of terabytes.

## 4. API and event contracts

- `POST /v1/runs {task, budget: {maxTokens, maxToolCalls, maxWallClockSeconds}}` -> `{runId, status}`.
- `GET /v1/runs/{id}/events` streams a typed event log; `POST /v1/runs/{id}/approvals/{approvalId}:decide {approve|deny}` resolves a human gate.
- Events carry `runId`, `agentId`, `parentAgentId`, `stepIndex`, `traceId`: `AgentSpawned`, `ToolCallRequested`, `ToolCallCompleted`, `ApprovalRequested`, `RunTerminated`.

## 5. System context

```mermaid
flowchart LR
  accTitle: Multi-agent orchestration platform system context
  accDescr: Human and system actors use Multi-agent orchestration platform, which integrates with explicitly bounded external capabilities.
  A1["Application user<br/>Submits goals and reviews outcomes"] --> System
  A2["Human approver<br/>Authorizes high-impact steps"] --> System
  A3["Platform operator<br/>Defines tool, model, and budget policy"] --> System
  System["Multi-agent orchestration platform<br/>Owns the product capability and domain guarantees"]
  System --> E1["Model providers<br/>Serve routed inference under deadlines"]
  System --> E2["Tool providers<br/>Expose scoped external capabilities"]
```

### Context component roles

| Component | Role |
|---|---|
| Application user | Submits goals and reviews outcomes. |
| Human approver | Authorizes high-impact steps. |
| Platform operator | Defines tool, model, and budget policy. |
| Multi-agent orchestration platform | Owns the product boundary, core policy, and durable outcome. |
| Model providers | Serve routed inference under deadlines. |
| Tool providers | Expose scoped external capabilities. |

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Multi-agent orchestration platform container architecture
  accDescr: Deployable components separate the critical request, durable state, asynchronous work, and bounded AI path.
  C1["Workflow API<br/>Authenticates and records durable intent"]
  C2["Scheduler<br/>Leases runnable step epochs"]
  C3["Worker sandbox<br/>Executes one isolated agent step"]
  C4["Model gateway<br/>Routes models, budgets, and fallbacks"]
  C5["Tool gateway<br/>Brokers scoped credentials and validates calls"]
  C6[("Workflow store<br/>Persists state, checkpoints, and approvals")]
  C7[("Event stream<br/>Coordinates retries and audit events")]
  C8["Evaluation service<br/>Scores traces and rollout quality"]
  C1 --> C2 --> C3
  C3 --> C4
  C3 --> C5
  C2 --> C6
  C2 -. step event .-> C7
  C7 --> C3
  C7 --> C8
```

### Container component roles

| Component | Role |
|---|---|
| Workflow API | Authenticates and records durable intent. |
| Scheduler | Leases runnable step epochs. |
| Worker sandbox | Executes one isolated agent step. |
| Model gateway | Routes models, budgets, and fallbacks. |
| Tool gateway | Brokers scoped credentials and validates calls. |
| Workflow store | Persists state, checkpoints, and approvals. |
| Event stream | Coordinates retries and audit events. |
| Evaluation service | Scores traces and rollout quality. |

## 7. Component deep dive

The lead agent controller owns the plan: it decomposes the task into subagent assignments with explicit objectives, output contracts, and tool allowlists, mirroring how a human lead would brief specialists rather than letting subagents freely reinterpret scope. The tool gateway is the single choke point where every tool call is checked against the calling agent's permission scope, rate-limited, and — for irreversible actions — routed to the approval service before execution rather than after. The watchdog is a separate, non-LLM process that tracks token spend, tool-call count, wall-clock time, and repeated-state detection (hashing recent tool calls/results to catch an agent re-issuing the same call) per run, independent of anything the model itself reports.

```mermaid
flowchart LR
  accTitle: Task decomposition and execution pipeline
  accDescr: A submitted task is planned, delegated to subagents, executed through a permissioned tool gateway, and continuously checked by a deterministic watchdog.
  Task --> Plan[Lead agent planning] --> Delegate[Subagent delegation]
  Delegate --> ToolCall[Permissioned tool call]
  ToolCall --> Result[Tool result] --> Context[Context handoff]
  Context --> Plan
  Watchdog[Deterministic watchdog] -.monitors.-> Plan
  Watchdog -.monitors.-> ToolCall
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Multi-agent task execution with loop detection and approval gate
  accDescr: A lead agent delegates to a subagent whose irreversible tool call requires human approval, while a watchdog independently monitors for loops and budget overruns.
  Client->>API: submit task with budget
  API->>Lead: start run
  Lead->>Spawner: spawn subagent(objective, tool scope)
  Spawner->>Subagent: execute
  Subagent->>ToolGW: call tool (irreversible: send_email)
  ToolGW->>ApprovalSvc: request human approval
  ApprovalSvc-->>Reviewer: notify
  Reviewer-->>ApprovalSvc: approve
  ApprovalSvc-->>ToolGW: approved
  ToolGW->>Sandbox: execute tool call
  Sandbox-->>Subagent: result
  Subagent-->>Lead: handoff summary + context
  par watchdog monitoring
    Watchdog->>Watchdog: check token/time/repeat-state budget
  end
  alt budget exceeded or loop detected
    Watchdog->>Lead: terminate run
    Lead-->>API: RunTerminated(reason=watchdog)
  else within budget
    Lead-->>API: RunCompleted
  end
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Multi-agent orchestration data model
  accDescr: Runs spawn agents that issue tool calls, some of which require approvals, all logged to a shared context store keyed by run.
  RUN ||--o{ AGENT : spawns
  AGENT ||--o{ TOOL_CALL : issues
  TOOL_CALL ||--o| APPROVAL : requires
  RUN ||--o{ CONTEXT_ENTRY : accumulates
  RUN { uuid id string task string status jsonb budget }
  AGENT { uuid id uuid run_id uuid parent_agent_id string role string status }
  TOOL_CALL { uuid id uuid agent_id string tool_name jsonb args string result_status }
  APPROVAL { uuid id uuid tool_call_id string status uuid decided_by }
```

## 10. Storage, partitioning, consistency, and caching

Partition run state, transcripts, and tool-call logs by `runId`, keeping all mutations for a single run on one shard for simple ordering. Run status transitions (active/terminated/completed) and approval decisions require strong consistency with compare-and-set, since a double-approved irreversible action is unacceptable. Context handoff between agents reads the latest committed context entries for a run — eventually consistent by a few hundred milliseconds is acceptable since agent turns are already seconds apart. Cache tool schemas and permission scopes, which change rarely, at the gateway.

## 11. Reliability and failure handling

The watchdog enforces hard ceilings independently of the model: max wall-clock per run, max tokens, max tool calls, and a repeated-state detector that flags when the last N tool call/result pairs are near-duplicates, killing the run before a stuck agent burns budget indefinitely. Tool calls are idempotent where possible (idempotency keys on writes) so a retried call after a transient gateway failure does not double-execute an irreversible action. If a subagent crashes, the lead agent resumes from the last checkpointed context entry rather than restarting the whole run; if the model provider itself is degraded, the platform queues runs rather than executing with a silently degraded model.

## 12. Security, privacy, moderation, and abuse prevention

Every tool call carries the issuing agent's scoped permission token, minted per-run and revoked on run termination, so a compromised or misbehaving agent cannot call tools outside its assignment. The sandbox isolates tool execution (no shared filesystem/network access across concurrent runs) and redacts secrets from context before it is visible to any agent. Irreversible actions — payments, external sends, deletions — are enumerated in a policy table and always route through human approval regardless of the requesting agent's confidence; this list is reviewed and version-controlled, not left to model judgment.

## 13. AI architecture

Model routing selects a model per agent role — a cheaper/faster model for narrow tool-execution subagents, a stronger model for the lead's planning and synthesis — based on task complexity signals, not a single model for every step. Context window management compacts prior turns into structured summaries once a run approaches the model's context limit, prioritizing tool results and decisions over raw intermediate reasoning, so long runs stay within budget without losing task-critical state. Tool permissioning is capability-scoped per agent role (a research subagent gets read-only search tools; only the lead or a designated action-agent gets write-capable tools), enforced at the gateway rather than trusted from agent output.

## 14. Model lifecycle, evaluation, and observability

Evaluate plan quality (task decomposition correctness against held-out tasks), tool-call success rate, loop-termination rate, approval-gate coverage (percentage of irreversible actions that correctly triggered approval), and cost per completed run. Shadow new model versions on replayed historical runs before routing live traffic, then canary by task category. Trace every agent spawn and tool call with a shared `traceId` per run using OpenTelemetry-style spans, so a terminated run can be replayed step by step to find where it diverged.

## 15. Cost controls and deterministic fallbacks

Cap tokens, tool calls, and wall-clock per run at submission time and reject runs that don't specify a budget; route narrow, well-defined subtasks to smaller/cheaper models instead of the lead's frontier model. The watchdog's termination logic is deterministic code, not a model call, specifically so a stuck or looping agent can always be killed even if every model in the routing table is unavailable or itself the source of the loop. If the model provider is down, queue new runs and let in-flight runs checkpoint and pause rather than fail destructively.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Loop/runaway detection | deterministic non-LLM watchdog | model self-monitoring, rejected because it fails exactly when the model itself is malfunctioning |
| Agent topology | lead + delegated subagents | flat single-agent with a long tool loop, viable for simple single-domain tasks |
| Irreversible actions | mandatory human approval gate | fully autonomous execution, acceptable only for actions proven reversible/low-risk |
| Context handoff | structured summaries at compaction | passing full raw transcripts between agents, simpler but blows context budgets on long runs |

## 17. Phased evolution

MVP is a single agent with a bounded tool loop and a hard step-count ceiling. Phase 2 adds a lead/subagent split with a shared context store. Phase 3 adds the deterministic watchdog, approval gates, and per-role model routing. Phase 4 adds replay-based evaluation, canarying, and cost-aware routing across model tiers.

## 18. 45-minute interview walkthrough

Spend 5 minutes on requirements and what "irreversible" means here, 5 on capacity/token math, 10 on the container diagram and why the watchdog is a separate non-LLM component, 10 on the execution sequence with the approval gate, 5 on data model and consistency for approvals, 5 on security/permission scoping, and 5 on cost controls and trade-offs.

## 19. Follow-up questions and key takeaways

How do you detect a loop that isn't an exact repeat, just semantically circular? How would you handle two subagents that need to write to the same resource concurrently? What's the right timeout when a tool call itself is slow versus when the model is stuck? The key insight is that safety in this system cannot depend on the model behaving well — the watchdog, permission scoping, and approval gates are deterministic guardrails that hold even when the model doesn't.

## 20. References

- [How we built our multi-agent research system (Anthropic Engineering)](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
