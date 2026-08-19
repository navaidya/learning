---
title: "AI-Native Event Ticketing Platform Deployment Architecture"
summary: "A cloud-neutral deployment using event-partitioned inventory with global waiting room for Event ticketing platform, with explicit failure domains, state ownership, recovery, and AI degradation."
systemDesign: 18-event-ticketing
order: 19
deploymentStyle: "Event-partitioned inventory with global waiting room"
availabilityTarget: "waiting room and browse remain available while purchase correctness is protected"
regions: global
tags: [waiting-room, leases, inventory, bot-defense]
---

This page translates the logical design into a physical runtime view. Capability names are illustrative and cloud-neutral: select products only after measuring workload, operational skill, compliance, and recovery needs.

## 1. Deployment goals and assumptions

The deployment protects the parent design's critical invariant—one active lease or sale per seat with no oversell and no duplicate capture—while meeting waiting room and browse remain available while purchase correctness is protected. The synchronous customer path remains short; derived views, external calls, analytics, and expensive inference move behind durable boundaries whenever the product contract permits.

Assume three independent failure zones in an active region, immutable artifacts, workload identity, managed or dedicated state services separated from stateless request compute, and a paired recovery region. Each event is a consistency partition, admission is controlled, and AI cannot bypass seat or payment invariants. The Kubernetes or compute API is a management plane and never carries customer requests.

## 2. Traffic classes and critical paths

| Traffic class | Latency or freshness objective | Consistency | Deployment implication |
|---|---|---|---|
| Critical command | admitted seat selection p99 below 300 ms during onsale | Enforce the product invariant before acknowledgement | Ownership-route to zonal service replicas and authoritative regional state. |
| Dominant read | Bounded by the parent read target and declared staleness | Versioned cache or index may be eventual | Scale read replicas and caches independently; authoritative policy can bypass stale entries. |
| Event and background work | Seconds to minutes by business priority | At-least-once with idempotent consumers | Partition Hold expiry, purchase, ticket, and audit events and isolate critical from bulk queues. |
| AI advisory path | Hard deadline, confidence, policy, and cost gate | Never overrides deterministic invariants | Circuit-break inference and keep the non-AI result warm. |

```mermaid
sequenceDiagram
  accTitle: Event ticketing platform critical deployed request path
  accDescr: A client request crosses edge and regional compute, commits authoritative state, emits asynchronous work, and uses AI only within a bounded optional branch.
  participant C as Client
  participant E as Edge and gateway
  participant S as Admission, inventory, reservation, checkout, and ticket services
  participant D as Strongly consistent seat and order database
  participant Q as Hold expiry, purchase, ticket, and audit events
  participant W as Expiry, issue, notification, fraud, and reconciliation workers
  participant A as Advisory bot scoring and demand forecasting
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
  accTitle: Event ticketing platform cloud-neutral deployment
  accDescr: Clients cross edge protection into a regional gateway, then private zonal compute reaches managed state while control, telemetry, AI, external, and recovery paths remain separate.
  Client["Clients and operators<br/>Issue product commands and reads"] --> Edge["Global CDN, bot defense, and waiting room<br/>Terminates public traffic and rejects abuse"]
  Edge --> Traffic["Global or regional traffic policy<br/>Selects only healthy ownership-approved regions"]
  subgraph Active["Active serving region"]
    LB["Signed-admission regional storefront gateway<br/>Distributes traffic across healthy zones"]
    CP["Managed compute control plane<br/>Schedules and manages workloads only"]
    subgraph Compute["Event-affine reservation and checkout cells"]
      ZA["Zone A replicas<br/>Gateway and Admission, inventory, reservation, checkout, and ticket services"]
      ZB["Zone B replicas<br/>Gateway and Admission, inventory, reservation, checkout, and ticket services"]
      ZC["Zone C replicas<br/>Gateway and Admission, inventory, reservation, checkout, and ticket services"]
      Worker["Expiry, issue, notification, fraud, and reconciliation workers<br/>Consumes durable retryable work"]
      AI["Advisory bot scoring and demand forecasting<br/>Deadline-bounded and policy-controlled"]
      Telemetry["Telemetry collectors<br/>Batch, redact, and export signals"]
    end
    subgraph State["Managed or dedicated state plane outside request compute"]
      Primary[("Strongly consistent seat and order database<br/>Owns authoritative durable state")]
      Fast[("Event catalog, seat-map, and queue-position caches<br/>Serves low-latency derived or ephemeral state")]
      Stream[("Hold expiry, purchase, ticket, and audit events<br/>Decouples committed asynchronous work")]
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
  Worker --> External["Payment provider and venue scanner<br/>Reached through restricted egress"]
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
| Global CDN, bot defense, and waiting room | Globally or regionally distributed edge | Edge location and policy | Routing/config only | Rejects attacks and routes only to explicitly healthy regions. |
| Signed-admission regional storefront gateway | Active region across three zones | Managed capacity or gateway replica | No | Drains failed zones and preserves connection or request retries. |
| Managed compute control plane | Regional managed control capability | Provider-managed quorum | Desired-state metadata | Running workloads continue during a short management outage. |
| Admission, inventory, reservation, checkout, and ticket services | Private zonal replicas in Event-affine reservation and checkout cells | Replica by CPU, concurrency, connections, or queue lag | No local authority | Losing one replica or zone removes endpoints without losing durable state. |
| Strongly consistent seat and order database | Managed or dedicated multi-zone state plane | Shard, partition, connection, and storage unit | Yes | Quorum or replica failover preserves acknowledged authoritative state. |
| Event catalog, seat-map, and queue-position caches | Regional replicas or immutable serving indexes | Shard and memory/index bytes | Derived or ephemeral | Rebuilds from authority; stale data is bounded or bypassed for policy changes. |
| Hold expiry, purchase, ticket, and audit events | Multi-zone partitioned durable log/queue | Partition throughput and retention | Yes | Consumers replay from checkpoints after worker failure. |
| Expiry, issue, notification, fraud, and reconciliation workers | Private autoscaled worker pools | Queue age, lag, and concurrency | Checkpoints only | Work is retried idempotently or isolated in a dead-letter workflow. |
| Advisory bot scoring and demand forecasting | Isolated CPU/accelerator or managed inference pool | Requests, tokens, batches, and accelerator utilization | Model artifacts | Circuit opens to a deterministic fallback without failing the product. |
| Backup and recovery plane | Paired region plus versioned object storage | Recovery copy and restore throughput | Yes | Remains fenced until ownership, data, and capacity checks pass. |

## 4. Edge, ingress, and API tier

Global CDN, bot defense, and waiting room terminates public TLS, applies DDoS/WAF controls, rate limits abuse, and strips untrusted forwarding metadata. Traffic policy chooses a region only after independent health and ownership checks. At Signed-admission regional storefront gateway, the platform authenticates or validates signed identity, attaches trace and idempotency context, enforces request-size and deadline policy, and distributes traffic across healthy zones.

Long-lived connections, bulk upload, and normal command traffic receive separate listeners and capacity pools when relevant. The edge can serve immutable or explicitly stale-safe reads, but revocation, deletion, payment, privacy, and ownership decisions always consult an authoritative version boundary.

## 5. Kubernetes and compute layout

Place Event-affine reservation and checkout cells across three zones with topology spread, disruption budgets, anti-affinity for critical replicas, and reserved capacity so any one zone can disappear. Run Admission, inventory, reservation, checkout, and ticket services as stateless deployments where the domain permits; give Expiry, issue, notification, fraud, and reconciliation workers separate queues and resource pools so backlogs cannot exhaust request capacity. Specialized inference is isolated from product compute.

The managed compute control plane is shown separately because its API server, scheduler, and controllers manage desired state rather than serving users. Managed databases, streams, object storage, secrets, and globally distributed edge services remain outside the workload cluster. Dedicated stateful fleets are used only when the product itself is the cache, broker, or similar state platform.

## 6. Stateful data and messaging

Treat Strongly consistent seat and order database as authoritative. Partition by event ID, with each seat owned by one inventory partition and lease epoch. Apply strong consistency only to one active lease or sale per seat with no oversell and no duplicate capture; allow bounded eventual consistency for derived caches, indexes, analytics, and model features. Give Event catalog, seat-map, and queue-position caches a rebuild path and version watermark so stale values cannot overrule newer security or deletion state.

Begin Hold expiry, purchase, ticket, and audit events after a durable commit, preferably through a transactional outbox or native log append. Consumers checkpoint offsets, deduplicate event IDs, quarantine poison records, and expose oldest-work age. Archives, snapshots, and model artifacts use encrypted versioned object storage with lifecycle policy.

## 7. Network zones and security boundaries

Separate public edge, private application, restricted state, management, telemetry, and controlled-egress zones. Default-deny network policy allows only named service identities and ports. Workload identity replaces static credentials; secrets and envelope keys rotate through managed key services. bot resistance, signed admission tokens, account protection, ticket authenticity, and payment tokenization.

Payment provider and venue scanner is reached through allowlisted egress proxies with deadlines, circuit breakers, response-size limits, and audit. Treat external and model output as untrusted data. Administrative and break-glass actions require strong authentication, least privilege, short sessions, immutable audit, and where consequence demands it, dual approval.

## 8. Availability and failure-domain placement

Each customer-facing service has replicas in all three zones; the remaining two zones carry the protected load after one-zone loss. Readiness removes unhealthy endpoints, while startup and liveness checks avoid restart storms. Stateful services place quorum or synchronous replicas across zones and expose replica lag and recovery state.

Define error budgets separately for critical commands, reads, async freshness, and AI enhancement. Preserve correctness by shedding recommendation, analytics, bulk, and low-priority work before the authoritative command path.

## 9. Scaling and capacity mapping

The sizing method is explicit: onsale arrival rate sizes waiting-room tokens while admitted QPS, seat contention, and payment latency size reservation and checkout capacity. Load-test the complete protocol and record shape rather than relying on vendor headline throughput. Keep at least 30% burst/rebalance headroom plus enough reserved capacity to survive the largest declared failure domain.

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

The assumed **RPO** is zero for seat, lease, purchase, and ticket state. The assumed **RTO** is under 15 minutes for an event-cell promotion while admission remains paused and fenced. These are product choices, not properties automatically obtained by creating a second cluster. Backups are encrypted, immutable where required, restored in drills, and checked against application-level invariants.

Regional failover fences the old ownership epoch, verifies replication and external dependencies, promotes state, enables minimum safe capacity, shifts internal/safety traffic first, then gradually restores normal traffic. Reconcile delayed events and external effects before lifting write restrictions. Evolve from one zonal region to paired recovery and then independent regional cells only when measured scale and business impact justify the operational cost.

## 14. Failure scenarios and graceful degradation

| Failure scenario | Detection | Automatic or operator response | User-visible result |
|---|---|---|---|
| Failure: an event cell is overloaded | queue depth, lease latency, and inventory conflicts | reduce admission rate and preserve per-event isolation | buyers wait longer but seats do not oversell |
| Failure: payment is slow after a hold | provider deadline and hold age | extend only under bounded policy or release through the durable expiry stream | seat ownership stays unambiguous |
| Failure: bot scoring fails | model deadline or drift gate | use deterministic admission and velocity controls | fairness is less adaptive but purchase correctness holds |

AI degradation is explicit: use deterministic signed admission, velocity, proof-of-work, and queue policy when bot models are unavailable. The **deterministic product fallback** is tested in canaries and game days; inference may improve ranking, prediction, classification, or assistance but cannot bypass identity, authorization, ownership, money, privacy, durability, or safety rules.

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

1. Start at Global CDN, bot defense, and waiting room: explain trust, routing, and what can be served safely at the edge.
2. Follow the solid request path through Signed-admission regional storefront gateway into zonal Admission, inventory, reservation, checkout, and ticket services replicas.
3. Identify Strongly consistent seat and order database as authoritative and state the partition key: event ID, with each seat owned by one inventory partition and lease epoch.
4. Draw Event catalog, seat-map, and queue-position caches and Hold expiry, purchase, ticket, and audit events only after explaining which reads and side effects may be derived or eventual.
5. Separate Expiry, issue, notification, fraud, and reconciliation workers, Advisory bot scoring and demand forecasting, and Payment provider and venue scanner from the authoritative transaction with deadlines and durable events.
6. Explain one-zone survival, reserved capacity, and why the compute control plane is not in the customer path.
7. State the RPO/RTO, ownership fencing, promotion order, and reconciliation step for regional loss.
8. Close with the deterministic fallback, the cost trade-off, and the metric that would trigger a different architecture.

## 17. Cloud capability mapping

| Capability | Architectural responsibility | Illustrative alternatives | Selection criteria |
|---|---|---|---|
| Edge and traffic management | TLS, DDoS/WAF, caching, health-aware ownership routing | Anycast edge, CDN, global load-balancing DNS | Health semantics, origin protection, invalidation, compliance routing. |
| Compute orchestration | Zonal stateless services, jobs, autoscaling, rollout | Managed Kubernetes, managed containers, autoscaling VMs | Failure-zone spread, identity, upgrade policy, workload isolation. |
| Authoritative state | Strongly consistent seat and order database | Managed relational, distributed SQL, key-value, or dedicated state fleet | Transactions, quorum, latency, partitioning, restore behavior. |
| Fast serving state | Event catalog, seat-map, and queue-position caches | In-memory cache, read replica, search/vector index | Staleness, invalidation, hot-key behavior, rebuild time. |
| Durable messaging | Hold expiry, purchase, ticket, and audit events | Partitioned log, managed queue, transactional outbox relay | Ordering, replay, retention, throughput, consumer isolation. |
| Object and backup storage | Archives, snapshots, artifacts, recovery copies | Versioned object storage | Durability, immutability, lifecycle, regional copy, restore throughput. |
| Secrets and keys | Workload identity, encryption, rotation, audit | Managed secrets, KMS, HSM where required | Short-lived credentials, hardware assurance, rotation, access evidence. |
| Observability | SLOs, correlation, audit, incident evidence | OpenTelemetry collectors and metric/log/trace backends | Open standards, redaction, sampling, cardinality, retention. |
| AI/model serving | Advisory bot scoring and demand forecasting | In-cluster serving or managed inference endpoint | Tail latency, policy, model routing, cost, deterministic fallback. |
