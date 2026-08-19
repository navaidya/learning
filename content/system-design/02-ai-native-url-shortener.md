---
title: AI-Native URL Shortener (TinyURL-like)
summary: A low-latency redirect service with global caching, streaming analytics, semantic safety, and agent-resistant abuse controls.
order: 3
difficulty: intermediate
interviewMinutes: 45
scaleChallenge: Read-heavy global redirects while preserving safe, mutable link metadata
aiFocus: [destination risk classification, semantic link discovery, agent abuse detection]
tags: [url-shortener, edge, caching, abuse-prevention]
---

_Follows the [System Design Template](../00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a global short-link product supporting custom aliases, expiration, analytics, and safe redirects. AI may classify destinations and discover related links, but redirect latency and availability cannot depend on a model.

## 2. Requirements and scope

### Functional requirements

| ID | Requirement | Priority | Interview significance |
|---|---|---|---|
| FR-1 | The system must create, update, expire, disable, and resolve short links. | Must | Defines the authoritative synchronous command boundary and its invariants. |
| FR-2 | The system must redirect visitors from a code to the current safe destination. | Must | Defines the dominant read path, caches, indexes, and acceptable staleness. |
| FR-3 | The system must aggregate redirect analytics and classify destination risk off the redirect path. | Must | Separates durable acceptance from retryable fan-out and derived work. |
| FR-4 | The system must review abuse decisions, appeals, quotas, and global tombstones. | Should | Requires versioned configuration, least privilege, audit, and rollback. |

### Non-functional requirements

| Quality | Measurable target | Why it matters | Architecture consequence |
|---|---|---|---|
| Latency | p99 redirect below 50 ms at a healthy edge | Users experience this path directly. | Keep the critical path local, bounded, and independently scalable. |
| Availability | 99.99% redirect availability during a regional failure | A partial infrastructure failure must have an explicit outcome. | Spread workloads across failure zones and define degradation before failover. |
| Correctness | a disabled or expired code must not resolve after its invalidation bound | The system is not useful if its central invariant can be violated. | Use idempotency, ownership epochs, transactions, leases, or version checks where required. |
| Peak scale | sustain 40k peak redirects/s and 400 link creates/s | Peak traffic and skew determine partitions and isolation. | Partition by the domain ownership key, autoscale on work, and reserve burst headroom. |
| Security and privacy | block unsafe schemes, phishing, malware, SSRF targets, and automated enumeration | Abuse or data disclosure can outweigh availability. | Authenticate at the edge, authorize at the data boundary, encrypt, minimize, and audit. |

**Scope exclusions:** advertising, crawling the entire destination web, and executing destination content. **Assumptions:** redirect traffic is globally read-heavy, editable links use 302, and safety inference is asynchronous.

## 3. Capacity estimate

Assume 100M links created/month (39 writes/s average, 400/s peak) and 10B redirects/month (3,860/s average, 40k/s peak). A 500-byte link record needs about 600 GB/year raw, or roughly 1.8 TB/year with three replicas before index overhead. Ten billion 200-byte click events/month produce 2 TB/month before compression; aggregate early and tier raw events.

## 4. API and event contracts

- `POST /v1/links {url, customAlias?, expiresAt?}` → `{code, shortUrl, safetyState}`.
- `GET /{code}` performs a 301 for immutable links or 302 for editable links.
- `DELETE /v1/links/{code}` writes a tombstone; `RedirectObserved` is asynchronous and never blocks redirect.

## 5. System context

```mermaid
flowchart LR
  accTitle: Short-link platform system context
  accDescr: Human and system actors use Short-link platform, which integrates with explicitly bounded external capabilities.
  A1["Creator<br/>Creates links and reviews analytics"] --> System
  A2["Visitor<br/>Resolves a short code into a destination"] --> System
  A3["AI agent<br/>Uses scoped create and resolve tools"] --> System
  System["Short-link platform<br/>Owns the product capability and domain guarantees"]
  System --> E1["DNS and CDN<br/>Routes and caches global redirects"]
  System --> E2["Threat intelligence<br/>Supplies reputation and malware signals"]
```

### Context component roles

| Component | Role |
|---|---|
| Creator | Creates links and reviews analytics. |
| Visitor | Resolves a short code into a destination. |
| AI agent | Uses scoped create and resolve tools. |
| Short-link platform | Owns the product boundary, core policy, and durable outcome. |
| DNS and CDN | Routes and caches global redirects. |
| Threat intelligence | Supplies reputation and malware signals. |

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Short-link platform container architecture
  accDescr: Deployable components separate the critical request, durable state, asynchronous work, and bounded AI path.
  C1["Client<br/>Creates or resolves short links"]
  C2["Edge redirect<br/>Serves cached redirects without model calls"]
  C3["Link API<br/>Validates commands and ownership"]
  C4["ID allocator<br/>Produces collision-resistant Base62 codes"]
  C5["Link KV<br/>Stores versioned destination and safety state"]
  C6["Safety pipeline<br/>Classifies destinations asynchronously"]
  C7[("Event stream<br/>Buffers redirect observations")]
  C8["Analytics<br/>Builds privacy-safe aggregates"]
  C1 --> C2 --> C5
  C1 --> C3 --> C4
  C3 --> C5
  C3 -. scan request .-> C6 -. versioned verdict .-> C5
  C2 -. redirect observed .-> C7 --> C8
```

### Container component roles

| Component | Role |
|---|---|
| Client | Creates or resolves short links. |
| Edge redirect | Serves cached redirects without model calls. |
| Link API | Validates commands and ownership. |
| ID allocator | Produces collision-resistant Base62 codes. |
| Link KV | Stores versioned destination and safety state. |
| Safety pipeline | Classifies destinations asynchronously. |
| Event stream | Buffers redirect observations. |
| Analytics | Builds privacy-safe aggregates. |

## 7. Component deep dive

The write path normalizes the URL, validates protocol, allocates a random/non-sequential 64-bit ID, Base62 encodes it, and reserves custom aliases conditionally. Rules and threat lists provide an immediate decision; semantic classification runs asynchronously. High-risk links fail closed, unknown links can show an interstitial, and clean links redirect directly.

```mermaid
flowchart LR
  accTitle: Link creation and safety pipeline
  accDescr: URLs are normalized, aliases reserved, rules applied, records stored, and destinations classified into clean, warning, or blocked states.
  Input --> Normalize --> Reserve[Conditional alias reserve]
  Reserve --> Rules[Protocol and threat rules]
  Rules --> Store[(Link record)]
  Store --> Async[Sandbox fetch and classifier]
  Async --> State{risk state}
  State -->|clean| Direct[Direct redirect]
  State -->|unknown| Warn[Interstitial]
  State -->|blocked| Deny[Deny and appeal]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Cached redirect sequence
  accDescr: The edge resolves a code from local cache or the key-value store and emits analytics without blocking the redirect.
  Visitor->>Edge: GET /aZ91
  Edge->>Edge: check local cache and tombstone
  alt cache hit
    Edge-->>Visitor: 301/302 destination
  else miss
    Edge->>KV: get(aZ91)
    KV-->>Edge: destination, version, safety state
    Edge->>Edge: cache within state TTL
    Edge-->>Visitor: redirect or warning
  end
  Edge-->>Bus: RedirectObserved (best effort)
```

## 9. Data model

```mermaid
erDiagram
  accTitle: URL shortener data model
  accDescr: Owners create versioned links that accumulate aggregate click buckets and reviewable safety decisions.
  OWNER ||--o{ LINK : creates
  LINK ||--o{ LINK_VERSION : records
  LINK ||--o{ CLICK_BUCKET : aggregates
  LINK ||--o{ SAFETY_DECISION : receives
  LINK { string code string destination string state int version timestamp expires_at }
  CLICK_BUCKET { string code timestamp hour string country bigint count }
  SAFETY_DECISION { uuid id string code string model_version float confidence string outcome }
```

## 10. Storage, partitioning, consistency, and caching

Partition link KV by hash(code); random codes prevent hotspots. Alias creation is strongly consistent, while replicas and click counts are eventual. Push disable tombstones to edge caches; never let a long positive TTL override a newer tombstone. Cache negative lookups briefly to absorb scans.

## 11. Reliability and failure handling

Redirect edges serve cached clean links during regional KV failure. Creation is shed before redirects. Analytics uses at-least-once events with event-ID deduplication. Threat-feed and classifier outages move new unknown links to an interstitial, not silent approval; existing decisions retain bounded TTLs.

## 12. Security, privacy, moderation, and abuse prevention

Block unsafe schemes, SSRF targets, credential-bearing URLs, malware, and phishing. Rate-limit by account, network, device, and agent identity; rotate signals to resist automation. Aggregate IP/location fields and enforce retention. Provide reason codes, appeals, and signed moderation audit events.

## 13. AI architecture

An asynchronous pipeline renders destinations in a sandbox, extracts text/image features, and combines a compact classifier with reputation rules. Embeddings support owner-only semantic search. Agent clients use scoped tokens and MCP-style tools with strict redirect/create quotas; tool results are untrusted data, never executable instructions.

## 14. Model lifecycle, evaluation, and observability

Evaluate precision/recall by abuse class, false-positive appeal rate, language, latency, drift, and adversarial bypass. Shadow updates and canary only new links. Trace classifier version and decision IDs without recording sensitive destination content in general telemetry.

## 15. Cost controls and deterministic fallbacks

Deduplicate scans by normalized-domain fingerprint, cache verdicts, use rules before models, and reserve large multimodal models for uncertain cases. If inference is unavailable, keep redirects deterministic from stored safety state and route new unknown links through a warning page.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Code | random 64-bit Base62 | sequence+Base62 for simpler allocation but enumerable links |
| Redirect | edge cache + KV | relational DB until traffic justifies KV |
| Mutation | 302 for editable links | 301 for immutable links and maximum caching |
| Safety | rules plus async model | synchronous model only when policy accepts added latency |

## 17. Phased evolution

MVP provides random codes, SQL, Redis, and rules. Phase 2 adds CDN edge resolution and streaming aggregates. Phase 3 adds sandbox classification and appeals. Phase 4 adds privacy-safe semantic search and scoped agent access.

## 18. 45-minute interview walkthrough

Use 5 minutes for scope, 5 for traffic/storage math, 10 for redirect and create flows, 10 for caching/tombstones, 5 for analytics, 5 for abuse/AI, and 5 for alternatives and evolution.

## 19. Follow-up questions and key takeaways

How do disabled links invalidate worldwide caches? Why random rather than sequential IDs? How are hot celebrity links handled? The key is that redirect stays a tiny deterministic lookup; analytics and semantic safety are decoupled asynchronous systems.

## 20. References

- [Model Context Protocol 2026 updates](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
