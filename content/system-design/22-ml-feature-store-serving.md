---
title: AI-Native ML Feature Store & Serving Platform
summary: A feature store and model-serving platform that keeps online and offline features consistent, serves predictions at low latency, and safely rolls out new model versions.
order: 23
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Guaranteeing training/serving feature parity while serving low-latency inference at high throughput
aiFocus: [online/offline feature consistency, model registry and versioning, canary and shadow deployment, drift monitoring]
tags: [mlops, feature-store, model-serving, observability]
---

_Follows the [System Design Template](../00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a feature store and serving platform that lets teams define a feature once, use identical values for offline training and online inference, serve predictions within a tight latency budget, and roll out new model versions without a bad model silently degrading production.

## 2. Requirements and scope

### Functional requirements

| ID | Requirement | Priority | Interview significance |
|---|---|---|---|
| FR-1 | The system must register feature definitions, ingest values, materialize, and request online vectors. | Must | Defines the authoritative synchronous command boundary and its invariants. |
| FR-2 | The system must serve point-in-time-correct online and offline features with lineage. | Must | Defines the dominant read path, caches, indexes, and acceptable staleness. |
| FR-3 | The system must process streams and batches, backfill, validate, publish, and monitor freshness. | Must | Separates durable acceptance from retryable fan-out and derived work. |
| FR-4 | The system must manage schemas, ownership, access, TTL, quality, and training-serving compatibility. | Should | Requires versioned configuration, least privilege, audit, and rollback. |

### Non-functional requirements

| Quality | Measurable target | Why it matters | Architecture consequence |
|---|---|---|---|
| Latency | online multi-feature read p99 below 10 ms inside a region | Users experience this path directly. | Keep the critical path local, bounded, and independently scalable. |
| Availability | 99.99% online serving with last-known-good feature fallback | A partial infrastructure failure must have an explicit outcome. | Spread workloads across failure zones and define degradation before failover. |
| Correctness | event-time semantics, point-in-time joins, feature versions, and tenant access stay consistent | The system is not useful if its central invariant can be violated. | Use idempotency, ownership epochs, transactions, leases, or version checks where required. |
| Peak scale | ingest millions of updates/s and serve high-QPS model inference | Peak traffic and skew determine partitions and isolation. | Partition by the domain ownership key, autoscale on work, and reserve burst headroom. |
| Security and privacy | classify PII, restrict feature sets, encrypt values, audit access, and enforce deletion | Abuse or data disclosure can outweigh availability. | Authenticate at the edge, authorize at the data boundary, encrypt, minimize, and audit. |

**Scope exclusions:** training arbitrary models and silently deriving features from unapproved raw data. **Assumptions:** feature definitions are versioned code, offline truth can repair online state, and inference has defaults for missing features.

## 3. Capacity estimate

At 500 registered features across 50 models, 100k predictions/second at peak, and an average of 30 features per prediction, that is 3M feature reads/second against the online store, so the online path must be an in-memory or SSD-backed KV store, not a relational database. Offline, computing features over a 2-year, 10B-row event history for training runs is a batch job measured in hours, not milliseconds — the two paths have fundamentally different latency budgets and must share only transformation logic, not infrastructure. Feature freshness requirements vary: some features (account age) update daily, others (last-5-minutes click rate) require streaming materialization within seconds.

## 4. API and event contracts

- `GET /v1/features/online?entityId=&featureView=` -> `{features: {...}, asOfTimestamp}` for the hot serving path.
- `POST /v1/features/offline/retrieve {entityIds[], featureView, timestamps[]}` returns a point-in-time-correct training dataset join.
- `POST /v1/models/{name}/versions` registers an artifact with metadata; `POST /v1/models/{name}/versions/{v}:promote {stage: shadow|canary|production}` drives rollout.
- Events carry `featureView`, `entityId`, `eventTimestamp`, `schemaVersion`: `FeatureMaterialized`, `ModelVersionPromoted`, `DriftDetected`.

## 5. System context

```mermaid
flowchart LR
  accTitle: ML feature store and serving platform system context
  accDescr: Human and system actors use ML feature store and serving platform, which integrates with explicitly bounded external capabilities.
  A1["Data producer<br/>Publishes governed raw events and batches"] --> System
  A2["ML engineer<br/>Defines features and builds training sets"] --> System
  A3["Model service<br/>Reads low-latency online feature vectors"] --> System
  System["ML feature store and serving platform<br/>Owns the product capability and domain guarantees"]
  System --> E1["Data lake<br/>Stores historical source and offline features"]
  System --> E2["Model registry<br/>Links models to exact feature versions"]
```

### Context component roles

| Component | Role |
|---|---|
| Data producer | Publishes governed raw events and batches. |
| ML engineer | Defines features and builds training sets. |
| Model service | Reads low-latency online feature vectors. |
| ML feature store and serving platform | Owns the product boundary, core policy, and durable outcome. |
| Data lake | Stores historical source and offline features. |
| Model registry | Links models to exact feature versions. |

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: ML feature store and serving platform container architecture
  accDescr: Deployable components separate the critical request, durable state, asynchronous work, and bounded AI path.
  C1["Feature registry<br/>Owns definitions, lineage, and schemas"]
  C2[("Stream ingestion<br/>Validates event-time updates")]
  C3["Batch materializer<br/>Backfills and computes historical values"]
  C4[("Offline store<br/>Serves point-in-time training datasets")]
  C5[("Online store<br/>Serves latest low-latency vectors")]
  C6["Serving API<br/>Authorizes and assembles feature requests"]
  C7["Quality monitor<br/>Detects freshness, skew, and drift"]
  C8["Publication controller<br/>Promotes compatible feature versions"]
  C1 --> C2 --> C4
  C2 --> C5
  C3 --> C4
  C3 --> C5
  C6 --> C5
  C7 --> C4
  C7 --> C5
  C8 --> C2
  C8 --> C3
```

### Container component roles

| Component | Role |
|---|---|
| Feature registry | Owns definitions, lineage, and schemas. |
| Stream ingestion | Validates event-time updates. |
| Batch materializer | Backfills and computes historical values. |
| Offline store | Serves point-in-time training datasets. |
| Online store | Serves latest low-latency vectors. |
| Serving API | Authorizes and assembles feature requests. |
| Quality monitor | Detects freshness, skew, and drift. |
| Publication controller | Promotes compatible feature versions. |

## 7. Component deep dive

Feature transformation logic is defined once as a declarative pipeline (e.g., a windowed aggregation or a join) and compiled to two execution paths: a batch job that backfills the offline store and a streaming/on-demand job that keeps the online store current — both paths execute the same transformation definition so they cannot silently drift apart. The point-in-time join for training explicitly excludes any feature value materialized after the label's event timestamp, which is the specific mechanism that prevents label leakage. The inference gateway resolves which model version serves a request (production, canary percentage, or shadow-only) and logs the exact feature vector used, so any prediction can be reproduced.

```mermaid
flowchart LR
  accTitle: Feature materialization and consistency pipeline
  accDescr: A single feature definition compiles to both batch and streaming materialization jobs so offline training and online serving read logically identical values.
  Definition[Feature definition] --> BatchJob[Batch materialization] --> Offline[(Offline store)]
  Definition --> StreamJob[Streaming materialization] --> Online[(Online store)]
  Offline --> PITJoin[Point-in-time join] --> TrainingSet[Training dataset]
  Online --> ServeAPI[Online serving API]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Online prediction serving with shadow model comparison
  accDescr: An inference request retrieves features from the online store and routes to the production model while a shadow model runs in parallel for comparison without affecting the response.
  App->>InferenceGW: predict(entityId)
  InferenceGW->>Online: get features(entityId)
  Online-->>InferenceGW: feature vector + asOfTimestamp
  InferenceGW->>Prod: score(features)
  par shadow evaluation
    InferenceGW->>Shadow: score(features)
    Shadow-->>Monitor: log shadow prediction
  end
  Prod-->>InferenceGW: prediction
  InferenceGW-->>App: prediction + model version
  InferenceGW-->>Monitor: log served prediction + features
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Feature store and serving platform data model
  accDescr: Feature views define feature definitions materialized as feature values, while models have versions that are promoted through deployment stages and produce logged predictions.
  FEATURE_VIEW ||--o{ FEATURE_DEFINITION : contains
  FEATURE_DEFINITION ||--o{ FEATURE_VALUE : materializes
  MODEL ||--o{ MODEL_VERSION : has
  MODEL_VERSION ||--o{ DEPLOYMENT_STAGE : promoted_to
  MODEL_VERSION ||--o{ PREDICTION_LOG : produces
  FEATURE_VIEW { uuid id string name string owner }
  FEATURE_DEFINITION { uuid id uuid view_id string transform_expr string freshness_sla }
  MODEL_VERSION { uuid id uuid model_id string artifact_uri string stage }
  PREDICTION_LOG { uuid id uuid model_version_id jsonb feature_vector timestamp served_at }
```

## 10. Storage, partitioning, consistency, and caching

The online store partitions by entity ID in a KV or in-memory store (e.g., sorted by entity for locality), tuned purely for p99 read latency, with writes applied asynchronously from the materialization pipeline. The offline store is a columnar/data-lake format partitioned by event date, optimized for large scan-and-join throughput rather than point lookups. Online feature values carry an `asOfTimestamp` so staleness is observable rather than silently assumed; the platform enforces per-feature-view freshness SLAs and alerts when streaming materialization lags beyond them. Prediction logs (feature vector + model version + output) are append-only and retained long enough to support offline reproduction of any served prediction.

## 11. Reliability and failure handling

If streaming materialization falls behind, the online store serves the last successfully materialized value along with its staleness age rather than blocking, and the inference gateway can be configured to reject predictions above a staleness threshold for latency/freshness-sensitive features. Materialization jobs are idempotent and checkpointed by watermark, so a restart replays only the unprocessed window. If the online store itself degrades, the inference gateway fails over to a reduced feature set with a pre-registered fallback (default values or a simpler model) rather than failing the request outright, and this fallback path is itself tested and versioned.

## 12. Security, privacy, moderation, and abuse prevention

Feature definitions are access-controlled per feature view so teams cannot read features derived from data they are not entitled to (e.g., PII-derived features restricted to specific model use cases). Prediction logs containing feature vectors are subject to the same retention and deletion policies as the underlying source data, since a logged feature vector can itself be personal data. Model promotion to production requires a recorded approval and passes an automated policy check (bias/fairness slice evaluation, minimum eval score) before the registry allows the promotion API to succeed.

## 13. AI architecture

The model registry is the source of truth for what is running where: every model version records its training data snapshot, feature view versions it depends on, evaluation metrics, and current deployment stage (shadow, canary at a traffic percentage, production). Canary promotion shifts a small percentage of live traffic to the new version while comparing prediction distributions and downstream business metrics against the incumbent before widening; shadow deployment runs the new version on 100% of traffic without serving its output, purely to compare offline against the incumbent's live decisions. Version pinning means a rollback is a registry update (repoint traffic to the prior version), not a redeploy, keeping rollback time independent of build pipelines.

## 14. Model lifecycle, evaluation, and observability

Track training/serving skew directly by periodically replaying recent online feature reads through the offline point-in-time join and diffing the values — any nonzero diff indicates a materialization bug, not just a metric to watch. Monitor input drift (feature distribution shift via population stability index or similar) and output drift (prediction distribution shift) per model version, alerting before accuracy visibly degrades. Every prediction is traceable end-to-end: feature view versions used, model version, and latency breakdown, so a production incident can be attributed to a specific feature or model change.

## 15. Cost controls and deterministic fallbacks

Cache hot entity feature vectors at the inference gateway for repeat-scoring workloads, batch low-frequency feature updates instead of streaming everything, and tier cold offline data to cheaper storage classes. If the model-serving path itself fails or the registry is unreachable, the gateway falls back to a last-known-good pinned model version cached locally rather than blocking on registry lookups for every request — this fallback is deterministic and tested, not a live decision.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Feature consistency | single definition compiled to batch + stream jobs | separately maintained offline/online pipelines, rejected due to skew risk |
| Online store | KV/in-memory store keyed by entity | relational DB when read volume is low and joins are still needed at serving time |
| Rollout strategy | shadow then percentage canary | direct cutover for low-risk, easily reversible models |
| Rollback | registry traffic repoint | full redeploy, acceptable only when registry-based routing isn't available |

## 17. Phased evolution

MVP computes features in the training pipeline only, with no online store — predictions use batch-scored lookup tables. Phase 2 adds a real online KV store and a basic batch materialization job. Phase 3 adds streaming materialization, point-in-time-correct offline joins, and a model registry with manual promotion. Phase 4 adds automated canary/shadow rollout, drift monitoring, and skew-detection replay jobs.

## 18. 45-minute interview walkthrough

Spend 5 minutes on requirements and what "consistency" means here, 5 on capacity/latency budgets, 10 on the container diagram and the shared-definition materialization design, 10 on the serving sequence with shadow evaluation, 5 on storage/partitioning trade-offs, 5 on registry-driven rollout and rollback, and 5 on monitoring and fallbacks.

## 19. Follow-up questions and key takeaways

How would you detect training/serving skew before it affects live predictions rather than after? What's the right staleness threshold for a fraud-detection feature versus a recommendation feature? How do you version a feature definition without breaking models already depending on the old version? The key insight is that feature consistency is an engineering property enforced by sharing transformation logic across two very different execution paths, not a promise kept by convention — and the model registry makes rollout and rollback data operations, not deploys.

## 20. References

- [Scaling Machine Learning at Uber with Michelangelo](https://www.uber.com/blog/scaling-michelangelo/)
- [Feast: the Open Source Feature Store — documentation](https://docs.feast.dev/)
