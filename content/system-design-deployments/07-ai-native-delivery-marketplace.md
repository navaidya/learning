---
title: "AI-Native Delivery Marketplace Deployment Architecture"
summary: "A cloud-neutral deployment using market cells with zonal realtime and controlled regional recovery for Delivery marketplace, with explicit failure domains, state ownership, recovery, and AI degradation."
systemDesign: 07-ai-native-delivery-marketplace
order: 8
deploymentStyle: "Market cells with zonal realtime and controlled regional recovery"
availabilityTarget: "99.99% active-order state availability across a zone failure"
regions: multi-region
tags: [market-cells, geospatial, dispatch, orders]
---

This page translates the logical design into a physical runtime view. Capability names are illustrative and cloud-neutral: select products only after measuring workload, operational skill, compliance, and recovery needs.

## 1. Deployment goals and assumptions

The deployment protects the parent design's critical invariant—one valid order state transition, courier lease, inventory reservation, and payment capture—while meeting 99.99% active-order state availability across a zone failure. The synchronous customer path remains short; derived views, external calls, analytics, and expensive inference move behind durable boundaries whenever the product contract permits.

Assume three independent failure zones in an active region, immutable artifacts, workload identity, managed or dedicated state services separated from stateless request compute, and a paired recovery region. Each order belongs to one market cell, external providers handle maps and regulated card data, and AI has constrained fallback. The Kubernetes or compute API is a management plane and never carries customer requests.

## 2. Traffic classes and critical paths

| Traffic class | Latency or freshness objective | Consistency | Deployment implication |
|---|---|---|---|
| Critical command | quote p99 below 500 ms and normal courier assignment below 10 seconds | Enforce the product invariant before acknowledgement | Ownership-route to zonal service replicas and authoritative regional state. |
| Dominant read | Bounded by the parent read target and declared staleness | Versioned cache or index may be eventual | Scale read replicas and caches independently; authoritative policy can bypass stale entries. |
| Event and background work | Seconds to minutes by business priority | At-least-once with idempotent consumers | Partition Order and courier-location event streams and isolate critical from bulk queues. |
| AI advisory path | Hard deadline, confidence, policy, and cost gate | Never overrides deterministic invariants | Circuit-break inference and keep the non-AI result warm. |

```mermaid
sequenceDiagram
  accTitle: Delivery marketplace critical deployed request path
  accDescr: A client request crosses edge and regional compute, commits authoritative state, emits asynchronous work, and uses AI only within a bounded optional branch.
  participant C as Client
  participant E as Edge and gateway
  participant S as Order, marketplace, dispatch, and tracking services
  participant D as Transactional order, lease, and payment state
  participant Q as Order and courier-location event streams
  participant W as Settlement, notification, safety, and exception workers
  participant A as ETA, demand, and constrained dispatch serving
  C->>E: authenticated command with idempotency context
  E->>S: ownership-routed regional request
  alt inference healthy, allowed, and inside deadline
    S->>A: bounded feature request
    A-->>S: advisory score and confidence
  else inference unavailable, blocked, or over budget
    S->>S: deterministic policy fallback
  end
  S->>D: validate invariant and commit authoritative state
  D-->>S: committed version and durable outcome
  S-->>C: authoritative response
  S-->>Q: publish committed domain event
  Q-->>W: deliver retryable asynchronous work
```

The authoritative response is returned only after the durable invariant is established. Downstream work may be replayed; every consumer uses event IDs, schema versions, and idempotent effects.

## 3. Deployment architecture

```mermaid
flowchart TB
  accTitle: Delivery marketplace cloud-neutral deployment
  accDescr: Clients cross edge protection into a regional gateway, then private zonal compute reaches managed state while control, telemetry, AI, external, and recovery paths remain separate.
  Client["Clients and operators<br/>Issue product commands and reads"] --> Edge["Regional edge protection and realtime routing<br/>Terminates public traffic and rejects abuse"]
  Edge --> Traffic["Global or regional traffic policy<br/>Selects only healthy ownership-approved regions"]
  subgraph Active["Active serving region"]
    LB["Market-aware API and connection gateway<br/>Distributes traffic across healthy zones"]
    CP["Managed compute control plane<br/>Schedules and manages workloads only"]
    subgraph Compute["Three-zone market workload cluster"]
      ZA["Zone A replicas<br/>Gateway and Order, marketplace, dispatch, and tracking services"]
      ZB["Zone B replicas<br/>Gateway and Order, marketplace, dispatch, and tracking services"]
      ZC["Zone C replicas<br/>Gateway and Order, marketplace, dispatch, and tracking services"]
      Worker["Settlement, notification, safety, and exception workers<br/>Consumes durable retryable work"]
      AI["ETA, demand, and constrained dispatch serving<br/>Deadline-bounded and policy-controlled"]
      Telemetry["Telemetry collectors<br/>Batch, redact, and export signals"]
    end
    subgraph State["Managed or dedicated state plane outside request compute"]
      Primary[("Transactional order, lease, and payment state<br/>Owns authoritative durable state")]
      Fast[("Courier geo state and online feature cache<br/>Serves low-latency derived or ephemeral state")]
      Stream[("Order and courier-location event streams<br/>Decouples committed asynchronous work")]
      Object[("Object and backup storage<br/>Holds archives, snapshots, and artifacts")]
      Keys["Secrets and key management<br/>Issues short-lived identity and encryption keys"]
    end
    LB --> ZA
    LB --> ZB
    LB --> ZC
    ZA --> Primary
    ZB --> Primary
    ZC --> Primary
    ZA --> Fast
    ZB --> Fast
    ZC --> Fast
    Primary -. committed event .-> Stream --> Worker
    ZA -. bounded advice .-> AI
    CP -. management only .-> ZA
    CP -. management only .-> ZB
    CP -. management only .-> ZC
    Keys -. workload identity .-> ZA
    Telemetry -. off-path signals .-> Object
  end
  Traffic --> LB
  Worker --> External["Routing, payment, and emergency providers<br/>Reached through restricted egress"]
  subgraph Recovery["Paired recovery region"]
    Warm["Warm compute cell<br/>Minimum safe capacity with ingress fenced"]
    Standby[("Standby state<br/>Replicas, checkpoints, backups, and artifacts")]
  end
  Primary -. encrypted replication .-> Standby
  Stream -. critical event replication .-> Standby
  Object -. versioned regional copy .-> Standby
  Traffic -. fail over after fencing .-> Warm
```

Solid arrows are request or event movement. Dotted arrows are management, identity, replication, telemetry, or failover relationships. The control plane schedules workloads but is deliberately absent from the customer data path.

### Deployment inventory

| Component | Runtime and placement | Scaling unit | Stateful | Failure behavior |
|---|---|---|---|---|
| Regional edge protection and realtime routing | Globally or regionally distributed edge | Edge location and policy | Routing/config only | Rejects attacks and routes only to explicitly healthy regions. |
| Market-aware API and connection gateway | Active region across three zones | Managed capacity or gateway replica | No | Drains failed zones and preserves connection or request retries. |
| Managed compute control plane | Regional managed control capability | Provider-managed quorum | Desired-state metadata | Running workloads continue during a short management outage. |
| Order, marketplace, dispatch, and tracking services | Private zonal replicas in Three-zone market workload cluster | Replica by CPU, concurrency, connections, or queue lag | No local authority | Losing one replica or zone removes endpoints without losing durable state. |
| Transactional order, lease, and payment state | Managed or dedicated multi-zone state plane | Shard, partition, connection, and storage unit | Yes | Quorum or replica failover preserves acknowledged authoritative state. |
| Courier geo state and online feature cache | Regional replicas or immutable serving indexes | Shard and memory/index bytes | Derived or ephemeral | Rebuilds from authority; stale data is bounded or bypassed for policy changes. |
| Order and courier-location event streams | Multi-zone partitioned durable log/queue | Partition throughput and retention | Yes | Consumers replay from checkpoints after worker failure. |
| Settlement, notification, safety, and exception workers | Private autoscaled worker pools | Queue age, lag, and concurrency | Checkpoints only | Work is retried idempotently or isolated in a dead-letter workflow. |
| ETA, demand, and constrained dispatch serving | Isolated CPU/accelerator or managed inference pool | Requests, tokens, batches, and accelerator utilization | Model artifacts | Circuit opens to a deterministic fallback without failing the product. |
| Backup and recovery plane | Paired region plus versioned object storage | Recovery copy and restore throughput | Yes | Remains fenced until ownership, data, and capacity checks pass. |

## 4. Edge, ingress, and API tier

Regional edge protection and realtime routing terminates public TLS, applies DDoS/WAF controls, rate limits abuse, and strips untrusted forwarding metadata. Traffic policy chooses a region only after independent health and ownership checks. At Market-aware API and connection gateway, the platform authenticates or validates signed identity, attaches trace and idempotency context, enforces request-size and deadline policy, and distributes traffic across healthy zones.

Long-lived connections, bulk upload, and normal command traffic receive separate listeners and capacity pools when relevant. The edge can serve immutable or explicitly stale-safe reads, but revocation, deletion, payment, privacy, and ownership decisions always consult an authoritative version boundary.

## 5. Kubernetes and compute layout

Place Three-zone market workload cluster across three zones with topology spread, disruption budgets, anti-affinity for critical replicas, and reserved capacity so any one zone can disappear. Run Order, marketplace, dispatch, and tracking services as stateless deployments where the domain permits; give Settlement, notification, safety, and exception workers separate queues and resource pools so backlogs cannot exhaust request capacity. Specialized inference is isolated from product compute.

The managed compute control plane is shown separately because its API server, scheduler, and controllers manage desired state rather than serving users. Managed databases, streams, object storage, secrets, and globally distributed edge services remain outside the workload cluster. Dedicated stateful fleets are used only when the product itself is the cache, broker, or similar state platform.

## 6. Stateful data and messaging

Treat Transactional order, lease, and payment state as authoritative. Partition by market and order ID, with courier positions grouped by spatial cell. Apply strong consistency only to one valid order state transition, courier lease, inventory reservation, and payment capture; allow bounded eventual consistency for derived caches, indexes, analytics, and model features. Give Courier geo state and online feature cache a rebuild path and version watermark so stale values cannot overrule newer security or deletion state.

Begin Order and courier-location event streams after a durable commit, preferably through a transactional outbox or native log append. Consumers checkpoint offsets, deduplicate event IDs, quarantine poison records, and expose oldest-work age. Archives, snapshots, and model artifacts use encrypted versioned object storage with lifecycle policy.

## 7. Network zones and security boundaries

Separate public edge, private application, restricted state, management, telemetry, and controlled-egress zones. Default-deny network policy allows only named service identities and ports. Workload identity replaces static credentials; secrets and envelope keys rotate through managed key services. protect precise location and payment data with scoped operational access.

Routing, payment, and emergency providers is reached through allowlisted egress proxies with deadlines, circuit breakers, response-size limits, and audit. Treat external and model output as untrusted data. Administrative and break-glass actions require strong authentication, least privilege, short sessions, immutable audit, and where consequence demands it, dual approval.

## 8. Availability and failure-domain placement

Each customer-facing service has replicas in all three zones; the remaining two zones carry the protected load after one-zone loss. Readiness removes unhealthy endpoints, while startup and liveness checks avoid restart storms. Stateful services place quorum or synchronous replicas across zones and expose replica lag and recovery state.

Define error budgets separately for critical commands, reads, async freshness, and AI enhancement. Preserve correctness by shedding recommendation, analytics, bulk, and low-priority work before the authoritative command path.

## 9. Scaling and capacity mapping

The sizing method is explicit: meal-time order peaks size order and dispatch replicas while courier location events/s determine stream partitions, geo memory, and ingestion workers. Load-test the complete protocol and record shape rather than relying on vendor headline throughput. Keep at least 30% burst/rebalance headroom plus enough reserved capacity to survive the largest declared failure domain.

Scale gateways on connections and tail latency, stateless APIs on concurrency and dependency saturation, streams on bytes/s and partition lag, workers on oldest-work age, state on throughput/storage/hot-key distribution, and inference on deadline success, batch efficiency, tokens, and accelerator utilization. Cap every autoscaler to protect downstream state.

## 10. Configuration, secrets, and service discovery

Store versioned configuration outside images and promote the same signed artifact through environments. Validate policy and schema before publication, canary high-impact changes, and retain a last-known-good snapshot. Service discovery advertises only ready endpoints and includes zone/region metadata for topology-aware routing.

Secrets are never committed to configuration files. Workloads authenticate through identity federation, fetch short-lived credentials at runtime, and use envelope encryption with audited key rotation. Feature flags have owners, expiry, safe defaults, and emergency rollback.

## 11. Observability and operations

OpenTelemetry collectors batch, redact, sample, and export metrics, logs, and traces off the request path. Correlate request ID, tenant or ownership shard, deployment version, event ID, model version, policy version, and recovery epoch without logging sensitive payloads.

Alert on user-visible SLO burn, saturation, oldest queue age, state quorum, replica lag, cache/index watermark, external circuit state, and recovery-copy freshness. Run synthetic critical journeys from multiple zones and regions. Dashboards link symptoms to dependency health, rollout version, and failure domain.

## 12. Release, rollback, and data migration

Promote signed immutable artifacts with canary or progressive traffic, automated SLO gates, and one-click rollback. Models shadow and canary separately from application releases. A model rollback never requires an application rollback, and deterministic behavior remains continuously exercised.

Use backward-compatible API and event schemas. Database changes follow expand/migrate/contract: add compatible fields or tables, deploy dual readers/writers if necessary, backfill with checkpoints and rate limits, verify invariants, switch reads, then remove old state in a later release.

## 13. Disaster recovery and multi-region evolution

The assumed **RPO** is zero for acknowledged order and payment transitions and under 60 seconds for raw courier history. The assumed **RTO** is under 10 minutes for active-order recovery in a paired market region. These are product choices, not properties automatically obtained by creating a second cluster. Backups are encrypted, immutable where required, restored in drills, and checked against application-level invariants.

Regional failover fences the old ownership epoch, verifies replication and external dependencies, promotes state, enables minimum safe capacity, shifts internal/safety traffic first, then gradually restores normal traffic. Reconcile delayed events and external effects before lifting write restrictions. Evolve from one zonal region to paired recovery and then independent regional cells only when measured scale and business impact justify the operational cost.

## 14. Failure scenarios and graceful degradation

| Failure scenario | Detection | Automatic or operator response | User-visible result |
|---|---|---|---|
| Failure: one market zone fails | gateway, pod, and zone health | remove endpoints and use reserved replicas in remaining zones | active orders reconnect and continue |
| Failure: courier-location lag grows | partition lag and freshness watermark | reduce sampling and widen last-valid spatial lookup | tracking becomes less precise before orders fail |
| Failure: ETA or dispatch models fail | deadline, confidence, or cost guardrail | invoke the deterministic distance and eligibility fallback | assignment may be less optimal but remains safe |

AI degradation is explicit: use deterministic distance, readiness, eligibility, and fairness scoring as the dispatch and ETA fallback. The **deterministic product fallback** is tested in canaries and game days; inference may improve ranking, prediction, classification, or assistance but cannot bypass identity, authorization, ownership, money, privacy, durability, or safety rules.

## 15. Cost and architecture trade-offs

| Decision | Recommended choice | Cost paid | Reconsider when |
|---|---|---|---|
| Failure domains | Three-zone active region with a fenced recovery copy | Reserved capacity and replication | Business RTO permits a cheaper cold restore. |
| State placement | Managed or dedicated state outside stateless request compute | Service cost and operational boundaries | A proven team and economics justify self-management. |
| Async isolation | Durable streams and separate worker pools | More infrastructure and eventual derived views | Workload is small enough for a transactional monolith. |
| Global footprint | Ownership-based cells rather than synchronous global writes | Routing and recovery complexity | Strong global consistency is a hard product requirement. |
| AI serving | Isolated, deadline-bound, and optional | Extra compute, evaluation, and telemetry | Measured product value does not exceed inference cost and risk. |

Network egress, replicated state, idle recovery capacity, long retention, and specialized accelerators usually dominate. Control cost with lifecycle policy, compression, batching, sampling, right-sized replicas, and smaller models—not by weakening the product invariant.

## 16. Interview walkthrough

1. Start at Regional edge protection and realtime routing: explain trust, routing, and what can be served safely at the edge.
2. Follow the solid request path through Market-aware API and connection gateway into zonal Order, marketplace, dispatch, and tracking services replicas.
3. Identify Transactional order, lease, and payment state as authoritative and state the partition key: market and order ID, with courier positions grouped by spatial cell.
4. Draw Courier geo state and online feature cache and Order and courier-location event streams only after explaining which reads and side effects may be derived or eventual.
5. Separate Settlement, notification, safety, and exception workers, ETA, demand, and constrained dispatch serving, and Routing, payment, and emergency providers from the authoritative transaction with deadlines and durable events.
6. Explain one-zone survival, reserved capacity, and why the compute control plane is not in the customer path.
7. State the RPO/RTO, ownership fencing, promotion order, and reconciliation step for regional loss.
8. Close with the deterministic fallback, the cost trade-off, and the metric that would trigger a different architecture.

## 17. Cloud capability mapping

| Capability | Architectural responsibility | Illustrative alternatives | Selection criteria |
|---|---|---|---|
| Edge and traffic management | TLS, DDoS/WAF, caching, health-aware ownership routing | Anycast edge, CDN, global load-balancing DNS | Health semantics, origin protection, invalidation, compliance routing. |
| Compute orchestration | Zonal stateless services, jobs, autoscaling, rollout | Managed Kubernetes, managed containers, autoscaling VMs | Failure-zone spread, identity, upgrade policy, workload isolation. |
| Authoritative state | Transactional order, lease, and payment state | Managed relational, distributed SQL, key-value, or dedicated state fleet | Transactions, quorum, latency, partitioning, restore behavior. |
| Fast serving state | Courier geo state and online feature cache | In-memory cache, read replica, search/vector index | Staleness, invalidation, hot-key behavior, rebuild time. |
| Durable messaging | Order and courier-location event streams | Partitioned log, managed queue, transactional outbox relay | Ordering, replay, retention, throughput, consumer isolation. |
| Object and backup storage | Archives, snapshots, artifacts, recovery copies | Versioned object storage | Durability, immutability, lifecycle, regional copy, restore throughput. |
| Secrets and keys | Workload identity, encryption, rotation, audit | Managed secrets, KMS, HSM where required | Short-lived credentials, hardware assurance, rotation, access evidence. |
| Observability | SLOs, correlation, audit, incident evidence | OpenTelemetry collectors and metric/log/trace backends | Open standards, redaction, sampling, cardinality, retention. |
| AI/model serving | ETA, demand, and constrained dispatch serving | In-cluster serving or managed inference endpoint | Tail latency, policy, model routing, cost, deterministic fallback. |
