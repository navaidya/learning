---
title: AI-Native Payments Ledger (Stripe/Venmo-like)
summary: A double-entry ledger and money-movement platform with exactly-once transfers, external reconciliation, and AI fraud scoring behind deterministic rule fallbacks.
order: 18
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Guaranteeing exactly-once money movement and a balanced ledger under partial failures and retries
aiFocus: [real-time fraud and anomaly scoring, transaction risk explanation for reviewers]
tags: [payments, ledger, consistency, fraud, machine-learning]
---

_Follows the [System Design Template](../00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a payments platform that holds account balances, moves money between accounts and external processors exactly once, reconciles against those processors, and scores transactions for fraud in real time — without ever double-charging, losing money, or letting a model decide whether to move money.

## 2. Requirements and scope

### Functional requirements

| ID | Requirement | Priority | Interview significance |
|---|---|---|---|
| FR-1 | The system must authorize, capture, refund, transfer, and query payment state. | Must | Defines the authoritative synchronous command boundary and its invariants. |
| FR-2 | The system must return authoritative balance, transaction, and reconciliation status. | Must | Defines the dominant read path, caches, indexes, and acceptable staleness. |
| FR-3 | The system must publish immutable ledger events, settle externally, reconcile, and investigate exceptions. | Must | Separates durable acceptance from retryable fan-out and derived work. |
| FR-4 | The system must manage risk, disputes, limits, keys, and dual-control financial operations. | Should | Requires versioned configuration, least privilege, audit, and rollback. |

### Non-functional requirements

| Quality | Measurable target | Why it matters | Architecture consequence |
|---|---|---|---|
| Latency | payment command p99 below 1 second excluding external challenge flows | Users experience this path directly. | Keep the critical path local, bounded, and independently scalable. |
| Availability | 99.99% ledger read and 99.95% write availability with zero acknowledged ledger loss | A partial infrastructure failure must have an explicit outcome. | Spread workloads across failure zones and define degradation before failover. |
| Correctness | double-entry balance, idempotency, monotonic status, and no duplicate external capture | The system is not useful if its central invariant can be violated. | Use idempotency, ownership epochs, transactions, leases, or version checks where required. |
| Peak scale | sustain peak commerce traffic while retaining immutable audit history | Peak traffic and skew determine partitions and isolation. | Partition by the domain ownership key, autoscale on work, and reserve burst headroom. |
| Security and privacy | isolate card data, use HSM-backed keys, dual control, tamper-evident audit, and strict egress | Abuse or data disclosure can outweigh availability. | Authenticate at the edge, authorize at the data boundary, encrypt, minimize, and audit. |

**Scope exclusions:** building card networks, foreign-exchange markets, and lending decisions. **Assumptions:** a licensed processor handles regulated card rails and financial correctness outranks immediate success.

## 3. Capacity estimate

At 5M transactions/day, average throughput is roughly 60/s with peaks (paydays, promotions) around 10x at 600/s. Each transaction produces at least two ledger entries (debit + credit) plus metadata, so at ~1 KB per entry pair, daily ledger growth is about 10 GB, or roughly 3.6 TB/year before replication — small enough to keep entries in a durable relational store rather than a data lake. Fraud scoring must complete within the authorization latency budget (typically under 100-200 ms) since it sits in the synchronous charge path.

## 4. API and event contracts

- `POST /v1/transfers` requires a client-generated idempotency key; the server stores the first response for that key and replays it on retry rather than re-executing the transfer.
- `POST /v1/transfers/{id}:capture` and `:void` use compare-and-set on transfer state to prevent double-capture.
- Events carry `eventId`, `occurredAt`, `schemaVersion`, and a ledger reference: `TransferInitiated`, `TransferAuthorized`, `LedgerEntriesPosted`, `TransferSettled`, `TransferReversed`, `FraudHoldApplied`.

## 5. System context

```mermaid
flowchart LR
  accTitle: Payments ledger system context
  accDescr: Human and system actors use Payments ledger, which integrates with explicitly bounded external capabilities.
  A1["Merchant service<br/>Submits idempotent payment commands"] --> System
  A2["Finance operator<br/>Reconciles settlement and investigates exceptions"] --> System
  A3["Customer<br/>Reviews payment and refund state"] --> System
  System["Payments ledger<br/>Owns the product capability and domain guarantees"]
  System --> E1["Payment processor<br/>Connects to regulated payment rails"]
  System --> E2["Banking network<br/>Settles external money movement"]
```

### Context component roles

| Component | Role |
|---|---|
| Merchant service | Submits idempotent payment commands. |
| Finance operator | Reconciles settlement and investigates exceptions. |
| Customer | Reviews payment and refund state. |
| Payments ledger | Owns the product boundary, core policy, and durable outcome. |
| Payment processor | Connects to regulated payment rails. |
| Banking network | Settles external money movement. |

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Payments ledger container architecture
  accDescr: Deployable components separate the critical request, durable state, asynchronous work, and bounded AI path.
  C1["Payment API<br/>Authenticates and validates idempotent commands"]
  C2["Risk rules<br/>Applies deterministic hard controls"]
  C3["Payment orchestrator<br/>Runs bounded processor workflows"]
  C4["Ledger service<br/>Commits balanced immutable entries"]
  C5[("Ledger database<br/>Stores serializable journal and balances")]
  C6[("Outbox stream<br/>Publishes committed payment facts")]
  C7["Reconciliation workers<br/>Compare internal and processor records"]
  C8["Model gateway<br/>Adds advisory fraud scoring within policy"]
  C1 --> C2 --> C3 --> C4 --> C5
  C4 -. committed entries .-> C6 --> C7
  C3 -. bounded risk signal .-> C8
```

### Container component roles

| Component | Role |
|---|---|
| Payment API | Authenticates and validates idempotent commands. |
| Risk rules | Applies deterministic hard controls. |
| Payment orchestrator | Runs bounded processor workflows. |
| Ledger service | Commits balanced immutable entries. |
| Ledger database | Stores serializable journal and balances. |
| Outbox stream | Publishes committed payment facts. |
| Reconciliation workers | Compare internal and processor records. |
| Model gateway | Adds advisory fraud scoring within policy. |

## 7. Component deep dive

The transfer orchestrator is a state machine (initiated -> authorized -> captured -> settled, or -> reversed) that persists every transition with an idempotency key and a monotonic version so retries and duplicate webhooks from external rails are safely absorbed. Every state transition that moves money writes a balanced double-entry pair (equal debits and credits) inside the same transaction as the state transition, never as a separate best-effort step. The fraud gateway sits in the authorization path with a hard timeout budget; it returns a risk score and never blocks the transaction indefinitely.

```mermaid
flowchart LR
  accTitle: Transfer authorization pipeline
  accDescr: A transfer request passes through idempotency checks, fraud scoring with a deterministic fallback, ledger posting, and rail submission.
  Request --> Idempotency[Idempotency key check]
  Idempotency --> Fraud{Fraud score in budget?}
  Fraud -- scored --> Decision[Allow/Hold/Block]
  Fraud -- timeout/unavailable --> RuleFallback[Deterministic velocity/amount rules]
  Decision --> Post[Post balanced ledger entries]
  RuleFallback --> Post
  Post --> Rail[Submit to bank/card rail]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Money transfer authorization and settlement sequence
  accDescr: A transfer is scored for fraud, posted as balanced ledger entries under a single transaction, and submitted to an external rail, with reconciliation later confirming settlement.
  Client->>Transfer: initiate(idempotencyKey, amount)
  Transfer->>Fraud: score(transaction)
  alt fraud service healthy
    Fraud-->>Transfer: risk score + decision
  else timeout
    Transfer->>Transfer: apply deterministic velocity/amount rules
  end
  Transfer->>Ledger: begin transaction
  Ledger-->>Transfer: debit + credit posted (balanced)
  Transfer->>Ledger: commit
  Transfer->>Rails: submit to bank/card rail
  Rails-->>Transfer: accepted
  Transfer-->>Client: transfer authorized
  Rails-->>Recon: settlement file (async)
  Recon->>Ledger: match and mark settled
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Payments ledger data model
  accDescr: Accounts hold balances, transfers reference balanced ledger entries, and each entry belongs to exactly one account and one transfer.
  ACCOUNT ||--o{ LEDGER_ENTRY : holds
  TRANSFER ||--o{ LEDGER_ENTRY : produces
  TRANSFER ||--o| FRAUD_DECISION : scored_by
  ACCOUNT { uuid id string owner_type string currency decimal balance }
  LEDGER_ENTRY { uuid id uuid account_id uuid transfer_id decimal amount string direction }
  TRANSFER { uuid id string status string idempotency_key int version }
  FRAUD_DECISION { uuid id uuid transfer_id float risk_score string decision string source }
```

## 10. Storage, partitioning, consistency, and caching

The ledger lives in a strongly consistent relational store with ACID transactions per transfer; partition by account or account-shard so a single transfer's debit and credit land on partitions that can be committed atomically (or via a two-phase commit / sagas for cross-shard transfers). Idempotency keys and transfer state use compare-and-set to reject duplicate execution. Read-heavy balance lookups can be cached with short TTLs, but any cache is invalidated synchronously on ledger writes — balances are never served stale on the write-confirmation path.

## 11. Reliability and failure handling

Every external rail call is wrapped in an outbox pattern: the ledger transaction commits first, then a durable event drives the rail submission with bounded retries and a dead-letter queue for manual review. If a rail acknowledgment is lost, reconciliation against the rail's settlement file is the source of truth for closing the loop, not a client retry. Circuit breakers isolate a failing fraud provider or rail from cascading into transfer rejection storms; degraded mode falls back to conservative deterministic rules rather than blocking all transfers.

## 12. Security, privacy, moderation, and abuse prevention

Tokenize card and bank account numbers, encrypt PII, and restrict raw ledger access to audited service accounts. Velocity limits, device/IP reputation, and the fraud model jointly gate large or anomalous transfers; the model provides a score and reasons, never an autonomous block/release decision above a configured risk threshold — that requires a human reviewer. All fraud holds, reversals, and account freezes are logged with reason codes for audit and regulatory reporting.

## 13. AI architecture

A real-time fraud model scores each transaction using account history, device/network signals, and graph features (shared devices/cards across accounts), returning a risk score and top contributing factors. A separate model assists human fraud reviewers by summarizing case evidence, but only the reviewer or a pre-approved deterministic rule can hold or release funds. The model never has write access to the ledger or transfer state machine.

## 14. Model lifecycle, evaluation, and observability

Train on labeled chargebacks/confirmed fraud with a delay for label maturity (chargebacks can take 60-120 days to resolve); backtest by transaction type, geography, and amount band before shadowing and canarying by traffic segment. Track precision/recall against confirmed fraud, false-positive rate (legitimate transactions blocked), reviewer override rate, latency, and drift. Trace every scoring call with the transfer ID so a disputed decision can be reconstructed end to end.

## 15. Cost controls and deterministic fallbacks

Cache stable account/device risk features, use a lightweight model on the synchronous authorization path and a heavier model for asynchronous post-transaction review, and batch graph feature recomputation. If the fraud service is unavailable or exceeds its latency budget, apply deterministic velocity and amount-threshold rules (fixed at conservative values); the transfer path never blocks waiting on a model. Ledger posting and rail submission have zero dependency on any AI component.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Consistency model | strong ACID ledger per transfer | eventual consistency with reconciliation only for cross-border/multi-rail settlement legs |
| Idempotency | client-supplied key with stored first response | server-generated dedup on (account, amount, timestamp window) if clients can't guarantee unique keys |
| Fraud scoring placement | synchronous, budget-capped, in authorization path | asynchronous post-authorization scoring with delayed hold for low-risk transaction classes |
| Cross-shard transfers | saga with compensation | two-phase commit if all accounts share one database engine |

## 17. Phased evolution

MVP uses a single-region relational ledger, synchronous transfers, and fixed velocity rules. Phase 2 adds idempotency keys, outbox-driven rail submission, and reconciliation. Phase 3 adds real-time fraud scoring with rule fallback and reviewer tooling. Phase 4 adds cross-shard sagas, graph-based fraud features, and continuous model evaluation against chargeback outcomes.

## 18. 45-minute interview walkthrough

Spend 5 minutes clarifying scope, 5 on capacity, 10 on the ledger data model and exactly-once transfer mechanics, 10 on the authorization sequence and container diagram, 5 on reliability/reconciliation, and 10 on fraud scoring, fallbacks, and trade-offs.

## 19. Follow-up questions and key takeaways

How do you handle a rail acknowledgment that arrives after the client has already timed out and retried? How would you extend the ledger to support multi-currency transfers? What's the blast radius if the fraud model starts scoring everything as high-risk? The key insight is that the ledger's ACID guarantees and idempotency are the actual product; fraud scoring is a bounded, always-overridable advisor that must never sit on the critical path to money moving correctly.

## 20. References

- [Designing robust and predictable APIs with idempotency (Stripe)](https://stripe.com/blog/idempotency)
- [Books: an immutable double-entry accounting database service (Square)](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/)
- [A primer on machine learning for fraud detection (Stripe)](https://stripe.com/blog/a-primer-on-machine-learning-for-fraud-detection)
