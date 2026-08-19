---
title: AI-Native Public Conversation Network (Twitter-like)
summary: A real-time public posting network with hybrid fan-out, provenance-aware media, transparent ranking, and defenses against coordinated agents.
order: 6
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Producing fresh personalized feeds across a highly skewed follower graph
aiFocus: [multimodal ranking, provenance, coordinated-agent detection]
tags: [social-feed, fanout, graph, moderation]
---

_Follows the [System Design Template](../00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a public short-post network with follows, replies, reposts, media, search, recommendations, and transparent controls for AI-generated content and automated accounts.

## 2. Requirements and scope

### Functional requirements

| ID | Requirement | Priority | Interview significance |
|---|---|---|---|
| FR-1 | The system must publish, reply, repost, delete, and moderate public posts. | Must | Defines the authoritative synchronous command boundary and its invariants. |
| FR-2 | The system must serve personalized home, conversation, search, and trending views. | Must | Defines the dominant read path, caches, indexes, and acceptable staleness. |
| FR-3 | The system must fan out posts, index media, rank feeds, and evaluate moderation signals. | Must | Separates durable acceptance from retryable fan-out and derived work. |
| FR-4 | The system must apply transparent policy, appeals, provenance, and coordinated-abuse controls. | Should | Requires versioned configuration, least privilege, audit, and rollback. |

### Non-functional requirements

| Quality | Measurable target | Why it matters | Architecture consequence |
|---|---|---|---|
| Latency | feed reads p99 below 300 ms and post acceptance below 500 ms | Users experience this path directly. | Keep the critical path local, bounded, and independently scalable. |
| Availability | 99.99% read availability and 99.9% write availability | A partial infrastructure failure must have an explicit outcome. | Spread workloads across failure zones and define degradation before failover. |
| Correctness | authoritative post state and visibility policy override stale cache or index entries | The system is not useful if its central invariant can be violated. | Use idempotency, ownership epochs, transactions, leases, or version checks where required. |
| Peak scale | handle celebrity fan-out, bursty news events, and globally distributed reads | Peak traffic and skew determine partitions and isolation. | Partition by the domain ownership key, autoscale on work, and reserve burst headroom. |
| Security and privacy | protect accounts, label provenance, rate-limit agents, and prevent coordinated manipulation | Abuse or data disclosure can outweigh availability. | Authenticate at the edge, authorize at the data boundary, encrypt, minimize, and audit. |

**Scope exclusions:** private encrypted messaging, ad auctions, and claims about proprietary company internals. **Assumptions:** posts have a home region, feeds tolerate bounded staleness, and ranking has chronological fallback.

## 3. Capacity estimate

For 300M daily users, 100M posts/day averages 1,160 writes/s and peaks near 12k/s. With 100 feed reads/user/day, average reads are 347k/s. At 1 KB metadata per post, one year is 36.5 TB before replicas; media dominates and uses object storage/CDN. Celebrity fan-out must never synchronously write to hundreds of millions of inboxes.

## 4. API and event contracts

- `POST /v1/posts` is idempotent and returns moderation/provenance state; `GET /v1/feed?cursor=&mode=` returns stable pagination.
- `FollowChanged`, `PostPublished`, `PostDeleted`, `ModerationChanged`, and `ProvenanceVerified` are versioned events.
- Feed items include ranking reason, content labels, author automation disclosure, and signed cursor.

## 5. System context

```mermaid
flowchart LR
  accTitle: Public conversation network system context
  accDescr: Human and system actors use Public conversation network, which integrates with explicitly bounded external capabilities.
  A1["Author<br/>Publishes posts and participates in conversations"] --> System
  A2["Reader<br/>Consumes feeds, search, and trends"] --> System
  A3["Moderator<br/>Reviews policy decisions and appeals"] --> System
  System["Public conversation network<br/>Owns the product capability and domain guarantees"]
  System --> E1["Media CDN<br/>Distributes images and video globally"]
  System --> E2["Provenance service<br/>Verifies signed content credentials"]
```

### Context component roles

| Component | Role |
|---|---|
| Author | Publishes posts and participates in conversations. |
| Reader | Consumes feeds, search, and trends. |
| Moderator | Reviews policy decisions and appeals. |
| Public conversation network | Owns the product boundary, core policy, and durable outcome. |
| Media CDN | Distributes images and video globally. |
| Provenance service | Verifies signed content credentials. |

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Public conversation network container architecture
  accDescr: Deployable components separate the critical request, durable state, asynchronous work, and bounded AI path.
  C1["Web and mobile clients<br/>Create posts and read conversations"]
  C2["API edge<br/>Authenticates, limits, and routes traffic"]
  C3["Post service<br/>Owns durable post and visibility state"]
  C4["Graph service<br/>Stores follow relationships"]
  C5["Fan-out pipeline<br/>Builds candidate inboxes asynchronously"]
  C6["Feed service<br/>Ranks and merges feed candidates"]
  C7[("Search index<br/>Serves lexical and vector discovery")]
  C8["Moderation service<br/>Applies rules, models, and appeal state"]
  C1 --> C2 --> C3
  C3 --> C4
  C3 -. publish .-> C5 --> C6
  C6 --> C4
  C6 --> C7
  C3 --> C8
  C8 -. visibility decision .-> C6
```

### Container component roles

| Component | Role |
|---|---|
| Web and mobile clients | Create posts and read conversations. |
| API edge | Authenticates, limits, and routes traffic. |
| Post service | Owns durable post and visibility state. |
| Graph service | Stores follow relationships. |
| Fan-out pipeline | Builds candidate inboxes asynchronously. |
| Feed service | Ranks and merges feed candidates. |
| Search index | Serves lexical and vector discovery. |
| Moderation service | Applies rules, models, and appeal state. |

## 7. Component deep dive

Ordinary authors fan out post IDs on write. High-fan-out authors remain in an author outbox and merge on read. The mixer gathers followed, conversation, and exploration candidates, applies blocks/safety/provenance rules, scores with a compact ranker, then enforces diversity and author caps. A chronological mode skips learned ranking.

```mermaid
flowchart LR
  accTitle: Feed mixing and ranking pipeline
  accDescr: Materialized timelines, high-fanout outboxes, and retrieval candidates pass through policy, ranking, diversity, and explanation stages.
  Inbox --> Merge[Candidate merge]
  Celeb[High-fanout outboxes] --> Merge
  Search[Graph and semantic retrieval] --> Merge
  Merge --> Policy[Blocks, safety, provenance]
  Policy --> Ranker[Multimodal ranker]
  Ranker --> Constraints[Diversity and fatigue]
  Constraints --> Explain[Reason codes]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Public post publication sequence
  accDescr: A post is durably stored then independently fanned out, indexed, checked for trust signals, and ranked for readers.
  Author->>Posts: publish(content, provenance)
  Posts->>Store: append version
  Posts-->>Bus: PostPublished
  par normal author
    Bus->>Fanout: append ID to follower inboxes
  and indexing
    Bus->>Retrieval: lexical/vector index
  and trust
    Bus->>Trust: classify and verify provenance
  end
  Reader->>Feed: home cursor
  Feed->>Rank: score eligible candidates
  Feed-->>Reader: items + labels + reasons
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Public conversation data model
  accDescr: Accounts publish threaded posts, form follow edges, create engagements, and attach versioned trust labels.
  ACCOUNT ||--o{ POST : publishes
  ACCOUNT ||--o{ FOLLOW : follows
  POST ||--o{ POST : replies_to
  POST ||--o{ ENGAGEMENT : receives
  POST ||--o{ TRUST_LABEL : labeled
  ACCOUNT { uuid id string automation_state string status }
  POST { uuid id uuid author_id uuid parent_id string body timestamp created_at }
  FOLLOW { uuid follower_id uuid followee_id timestamp created_at }
  TRUST_LABEL { uuid post_id string type string source int version }
```

## 10. Storage, partitioning, consistency, and caching

Shard posts by author ID plus time bucket; keep globally unique IDs for ordering. Partition graph edges by follower for home-feed reads and maintain reverse edges asynchronously for fan-out. Deletes/moderation use high-priority tombstone streams to invalidate timelines, caches, search, and CDN. Engagement counts are eventual; post authorship is immutable.

## 11. Reliability and failure handling

If ranking fails, return chronological eligible candidates. If fan-out lags, merge author outboxes on read and expose freshness. Event consumers checkpoint and deduplicate. Protect celebrity publishes with pull-based delivery. During overload, shed exploration and expensive embeddings before follows or publishing.

## 12. Security, privacy, moderation, and abuse prevention

Enforce blocks before candidate ranking, rate-limit writes and graph mutations, isolate untrusted media, and provide appeals. Detect coordinated behavior using graph/temporal signals with human-reviewed enforcement. Label automated accounts and C2PA-verifiable media; provenance is a signal, not proof of truth. Preserve moderator audit trails and minimize private behavioral features.

## 13. AI architecture

Specialized multimodal models produce safety, topic, quality, and ranking features. LLMs summarize long threads and assist moderators with cited evidence, but do not autonomously ban. Agent posting uses scoped credentials, declared identity, quotas, and provenance. Users can inspect ranking reasons and opt for chronological feeds.

## 14. Model lifecycle, evaluation, and observability

Measure feed latency, freshness, satisfaction, diversity, calibration, harmful exposure, false enforcement, appeals, and creator/follower-size slices. Use offline replay, shadow ranking, interleaving, guarded experiments, and rollback. Trace model/feature versions with OpenTelemetry while aggregating sensitive user signals.

## 15. Cost controls and deterministic fallbacks

Precompute embeddings, batch fan-out, limit candidate pools, cascade cheap-to-expensive rankers, cache public inference, and sample summaries. Chronological feed, rules moderation, keyword search, and publishing work without AI.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Feed | hybrid push/pull | pure pull for smaller graphs |
| Ranking | candidate cascade | single large model when latency/cost permit |
| Moderation | labels plus policy tiers | binary removal only for illegal/high-confidence harm |
| Provenance | C2PA signal | platform-only labels when source credentials absent |

## 17. Phased evolution

MVP offers posts, follows, chronological pull feeds, and rules. Phase 2 adds timeline materialization and search. Phase 3 adds hybrid fan-out and learned ranking. Phase 4 adds provenance, disclosed agents, multimodal trust, and transparent controls.

## 18. 45-minute interview walkthrough

Use 5 minutes for scope, 5 for scale, 10 for post/graph stores, 10 for hybrid fan-out, 5 for feed ranking, 5 for moderation/provenance, and 5 for failure modes and trade-offs.

## 19. Follow-up questions and key takeaways

How are celebrity posts delivered? How quickly does a delete disappear? How do agent swarms affect rate limits? Separate durable public truth from disposable feed projections, and always retain a chronological deterministic product beneath learned ranking.

## 20. References

- [C2PA technical specification and charter](https://spec.c2pa.org/about/charter/)
- [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
