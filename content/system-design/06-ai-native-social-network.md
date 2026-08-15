---
title: AI-Native Social Network (Facebook-like)
summary: A privacy-bounded social graph with multimodal feeds, audience policy enforcement, consent-aware memory, and scoped personal agents.
order: 6
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Enforcing changing audience permissions across graph, feed, media, search, and AI projections
aiFocus: [personal agents, consent-aware memory, multimodal recommendation]
tags: [social-graph, privacy, feeds, agents]
---

## 1. Interview prompt

Design a social network for profiles, friendships, groups, media, feeds, and a personal assistant that can organize and retrieve a user’s content without crossing audience or consent boundaries.

## 2. Requirements and scope

Profiles, reciprocal friendships, groups, posts/media, comments, audience selection, feed, search, notifications, and user-controlled agent tasks. Target p99 feed under 700 ms, fast revocation, regional data controls, and explainable ranking. Exclude advertising and face identification.

## 3. Capacity estimate

At 1B monthly and 500M daily users, 2 posts and 200 feed items/user/day yield 12k post writes/s average and 1.16M feed-item reads/s, with 5× peaks. Ten photos per monthly user at 2 MB is 20 PB/month logical ingress. The graph has tens of billions of edges and must partition without assuming every celebrity is a friend.

## 4. API and event contracts

- `POST /v1/posts {body, mediaIds, audiencePolicy}`; `GET /v1/feed?cursor=` returns reason and policy version.
- `POST /v1/agent/tasks` includes declared capability, selected resources, budget, expiry, and confirmation policy.
- `AudienceChanged` and `ConsentRevoked` are priority invalidation events consumed by feed, search, caches, embeddings, and agent memory.

## 5. System context

```mermaid
flowchart LR
  accTitle: Social network system context
  accDescr: Members, group administrators, and personal agents use the network through identity, media, and provenance services.
  Member --> Social[Social network]
  GroupAdmin --> Social
  Agent[Personal agent] --> Social
  Social --> Identity[Identity and recovery]
  Social --> CDN[Media CDN]
  Social --> Provenance[Content credentials]
```

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Social network container architecture
  accDescr: Graph, content, media, feed, ranking, agent, policy, and protected search components enforce audience-aware experiences.
  Apps --> Edge[API edge]
  Edge --> Graph[Social graph] --> GraphDB[(Graph shards)]
  Edge --> Content[Content service] --> SQL[(Metadata store)]
  Content --> Media[Media pipeline] --> Blob[(Object storage/CDN)]
  Content --> Bus[(Event log)] --> Feed[Feed materializer]
  Edge --> Mixer[Feed mixer] --> Feed
  Mixer --> Rank[Ranking models]
  Edge --> AgentGW[Scoped agent gateway] --> Policy[Audience and consent engine]
  AgentGW --> Search[(ACL-aware hybrid index)]
```

## 7. Component deep dive

Every resource references a versioned audience policy compiled to fast predicates. Reads evaluate viewer, relationship/group edge, resource policy, blocks, region, and revocation generation before returning content. Feed and search carry policy references but must recheck at serving time. Agent capabilities are short-lived grants narrower than the user session.

```mermaid
flowchart LR
  accTitle: Audience authorization pipeline
  accDescr: Identity, relationship, resource policy, and consent state combine before fields are redacted and an access decision is audited.
  Request --> Identity --> Resource[Resource + policy version]
  Resource --> Policy[Policy decision point]
  Graph[Relationship snapshot] --> Policy
  Consent[Consent and revocation] --> Policy
  Policy -->|allow| Redact[Field redaction]
  Policy -->|deny| Deny[Not found]
  Redact --> Audit[Privacy-safe audit]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Scoped personal agent sequence
  accDescr: A member grants a bounded task, retrieval is policy-checked, and the agent proposes an album before the user confirms mutation.
  Member->>AgentGW: organize selected trip photos
  AgentGW->>Policy: authorize capability + resources
  Policy-->>AgentGW: scoped grant, limits, expiry
  AgentGW->>Search: retrieve allowed media
  Search->>Policy: recheck current audience versions
  AgentGW-->>Member: proposed album + citations
  Member->>AgentGW: confirm create/share
  AgentGW->>Content: execute idempotent mutation
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Social network data model
  accDescr: Members form relationships, create audience-governed posts and media, join groups, and issue expiring agent grants.
  MEMBER ||--o{ RELATIONSHIP : connects
  MEMBER ||--o{ POST : creates
  GROUP ||--o{ MEMBERSHIP : contains
  POST ||--|| AUDIENCE_POLICY : governed_by
  POST ||--o{ MEDIA : attaches
  MEMBER ||--o{ AGENT_GRANT : authorizes
  AUDIENCE_POLICY { uuid id int version string expression }
  AGENT_GRANT { uuid id uuid member_id string capability timestamp expires_at }
  POST { uuid id uuid author_id uuid policy_id string body }
```

## 10. Storage, partitioning, consistency, and caching

Partition graph adjacency by member, content metadata by author/time, group membership by group, and media by content hash. Relationship acceptance and audience policy updates are strongly consistent in their home shard. Feeds, counts, search, and embeddings are projections. Cache authorization only with policy/revocation generation and short TTL.

## 11. Reliability and failure handling

Outbox events feed idempotent projections. If ranking fails, serve recent eligible friend/group posts. If policy or revocation data is unavailable, sensitive reads fail closed. Rebuild feeds/search from content and graph logs. Large-group fan-out uses pull/merge and adaptive backpressure.

## 12. Security, privacy, moderation, and abuse prevention

Default audiences conservatively, make sharing previews explicit, isolate media processing, and enforce block/revocation ahead of ranking. Protect graph queries from enumeration. Moderation combines rules, models, community/admin workflows, and appeal. C2PA signals disclose origin without treating provenance as factual verification.

## 13. AI architecture

Multimodal embeddings support accessible search and feed candidates. A personal agent uses capability-scoped MCP-style tools, consented memory with provenance/expiry, and proposal-before-action for posting, sharing, deleting, inviting, or messaging. Retrieved user content is data, not instructions; policy checks surround every tool call.

## 14. Model lifecycle, evaluation, and observability

Evaluate recommendation utility, diversity, harmful exposure, policy leakage, unsupported memories, action-confirmation rate, and demographic/graph-size slices. Red-team prompt injection in posts and images. Shadow and canary rankers; version embeddings and memory schemas. Trace tool/model IDs and authorization outcomes without storing private payloads.

## 15. Cost controls and deterministic fallbacks

Use cascaded ranking, precomputed features, embedding deduplication, bounded memory, task budgets, and small routing models. When AI is off or unhealthy, chronological feeds, keyword search, manual albums, audience controls, and all core social actions remain available.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Graph | sharded adjacency lists | graph database for smaller scale/richer traversal |
| Feed | hybrid materialize/merge | pull-only at early scale |
| Privacy | recheck at serving | projection-only checks are faster but unsafe on revocation |
| Agents | scoped proposal/confirm | autonomous action only for reversible low-risk operations |

## 17. Phased evolution

MVP adds profiles, friends, posts, explicit audiences, and chronological feeds. Phase 2 adds groups/media and projections. Phase 3 adds multimodal ranking/search. Phase 4 adds consent memory, scoped agents, provenance, and continuous privacy evaluation.

## 18. 45-minute interview walkthrough

Spend 5 minutes on scope, 5 on scale, 10 on graph/content stores, 10 on feed, 5 on audience revocation, 5 on personal agents, and 5 on reliability and trade-offs.

## 19. Follow-up questions and key takeaways

How does unfriend propagate? What makes agent memory revocable? How do large groups change fan-out? Treat authorization as live source-of-truth logic; every feed, index, embedding, and memory is only a revocable projection.

## 20. References

- [Model Context Protocol 2026 updates](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [C2PA technical specification and charter](https://spec.c2pa.org/about/charter/)
