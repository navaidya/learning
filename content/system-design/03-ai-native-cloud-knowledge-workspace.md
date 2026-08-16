---
title: AI-Native Cloud Knowledge Workspace (Dropbox-like)
summary: A secure file-sync workspace with content-addressed storage, offline collaboration, ACL-aware retrieval, and grounded assistants.
order: 4
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Correct multi-device synchronization of huge blobs and tiny metadata changes
aiFocus: [multimodal indexing, ACL-aware RAG, collaborative agents]
tags: [object-storage, sync, search, rag]
---

_Follows the [System Design Template](/system-design/00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a multi-device cloud drive with sharing, resumable sync, version history, search, and an assistant that answers from files without leaking content across access boundaries.

## 2. Requirements and scope

Upload/download, offline edits, folders, sharing, conflict copies, deletion recovery, full-text/multimodal search, and cited answers. Target durable blobs, p99 metadata operations under 300 ms, resumable transfer, and read-your-writes metadata. Exclude live document editing and public-web search.

## 3. Capacity estimate

For 100M users, 10M daily users, and 2 GB average stored, logical data is 200 PB. Deduplication and erasure coding determine physical size. At five changed files per DAU/day, average commits are 580/s and peak near 6k/s. One million concurrent clients polling would be wasteful, so use cursor-based push notifications.

## 4. API and event contracts

- `POST /uploads` creates a session; chunk PUTs include content hash; `POST /uploads/{id}:commit` atomically publishes a manifest.
- `GET /changes?cursor=` returns ordered metadata mutations; `POST /shares` records principal, resource, role, and expiry.
- `FileCommitted`, `AclChanged`, and `FileDeleted` drive indexing; every index document carries an ACL generation.

## 5. System context

```mermaid
flowchart LR
  accTitle: Cloud workspace system context
  accDescr: Users, administrators, and agents access the workspace through identity and key-management boundaries.
  User --> Workspace[Cloud knowledge workspace]
  Admin --> Workspace
  Agent --> Workspace
  Workspace --> Identity[Identity provider]
  Workspace --> KMS[Key management]
```

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Cloud workspace container architecture
  accDescr: Metadata and chunk transfer paths feed a change log, device notifications, protected search, and a grounded assistant.
  Clients --> Edge[Sync and API edge]
  Edge --> Metadata[Metadata service] --> SQL[(Sharded metadata DB)]
  Edge --> Transfer[Chunk transfer] --> Blob[(Object storage)]
  Metadata --> Bus[(Change log)]
  Bus --> Notify[Device notifier]
  Bus --> Index[Index pipeline] --> Search[(Lexical + vector index)]
  Search --> RAG[Grounded assistant gateway]
  RAG --> Policy[ACL policy engine]
```

## 7. Component deep dive

Clients split files into content-defined chunks, hash locally, ask which hashes are missing, upload only missing chunks, then commit an immutable manifest. The metadata transaction updates the path/version and emits an outbox event. Concurrent edits create deterministic conflict versions instead of silently choosing a winner.

```mermaid
flowchart LR
  accTitle: Resumable content-addressed upload pipeline
  accDescr: Clients chunk, hash, encrypt, upload missing data, publish a manifest, commit metadata, and append an ordered change.
  File --> Chunk[Content-defined chunking] --> Hash[Hash and encrypt]
  Hash --> Missing[Missing-chunk query] --> Upload[Parallel resumable upload]
  Upload --> Manifest[Immutable manifest]
  Manifest --> Commit[Metadata CAS commit] --> Change[Ordered change log]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: File upload and conflict sequence
  accDescr: A client uploads missing chunks and conditionally commits a manifest, producing either a new version or a preserved conflict.
  Client->>Transfer: create upload + chunk hashes
  Transfer-->>Client: missing hashes
  Client->>Transfer: upload missing encrypted chunks
  Client->>Metadata: commit(baseVersion, manifest)
  alt base version current
    Metadata-->>Client: new version and cursor
  else concurrent edit
    Metadata-->>Client: conflict version
  end
  Metadata-->>Bus: FileCommitted
  Bus-->>Index: extract, embed, attach ACL generation
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Cloud workspace data model
  accDescr: Nodes have immutable versions whose manifests reference deduplicated chunks and whose access is controlled by ACL entries.
  USER ||--o{ NODE : owns
  NODE ||--o{ VERSION : has
  VERSION ||--o{ MANIFEST_CHUNK : contains
  CHUNK ||--o{ MANIFEST_CHUNK : referenced_by
  NODE ||--o{ ACL_ENTRY : protects
  NODE { uuid id uuid parent_id string name int current_version }
  VERSION { uuid id uuid node_id string manifest_hash timestamp created_at }
  CHUNK { string hash bigint bytes string storage_key }
```

## 10. Storage, partitioning, consistency, and caching

Shard metadata by workspace/owner, keeping folder transactions local. Blob chunks are immutable, erasure-coded, regionally replicated, and garbage-collected only after reference scans and retention delay. Metadata is strongly consistent; device cursors, indexes, thumbnails, and usage counters converge asynchronously. Cache manifests and ACL decisions by generation.

## 11. Reliability and failure handling

Uploads are idempotent by hash; sessions resume after network loss. An outbox prevents committed files from missing indexing events. Rebuild search from manifests. Cross-region disaster recovery prioritizes metadata logs and encryption keys; orphan chunks are safe and collected later. Slow consumers use durable cursors and bounded compaction.

## 12. Security, privacy, moderation, and abuse prevention

Envelope-encrypt per workspace, separate key and object permissions, scan shared content in isolated workers, and record immutable access audits. Search filters ACLs before retrieval and again before response. Prompt content cannot grant tools or broaden access. Legal hold and deletion policies operate on manifests and derived indexes.

## 13. AI architecture

Extraction produces text, OCR, image/audio captions, and structured metadata. Hybrid lexical/vector retrieval filters by principal and ACL generation before ranking. The assistant receives small cited passages, uses read-only scoped tools by default, labels uncertain answers, and requires confirmation for move/share/delete actions.

## 14. Model lifecycle, evaluation, and observability

Evaluate retrieval recall under ACL filters, citation correctness, unsupported-claim rate, multilingual/OCR quality, and cross-tenant leakage (must be zero). Re-index new embeddings side-by-side, shadow queries, then atomically switch aliases. Trace document IDs and policy decisions, not raw content.

## 15. Cost controls and deterministic fallbacks

Deduplicate chunks and embeddings, embed only changed regions, tier cold blobs, cache extraction, and route simple queries to small models. Without AI, filename/full-text search and normal sync remain available. If vector indexing lags, show index freshness and use lexical results.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Blob identity | content-addressed chunks | fixed chunks for simpler clients |
| Conflicts | preserve both versions | CRDT for truly collaborative documents |
| Metadata | relational shards | globally consistent SQL for cross-region workspaces |
| Retrieval | ACL filter before and after | separate per-tenant indexes for stronger isolation at higher cost |

## 17. Phased evolution

MVP uses whole-file uploads and SQL metadata. Phase 2 adds chunking, cursors, and conflict versions. Phase 3 adds hybrid indexing. Phase 4 adds cited assistants, scoped MCP tools, evaluation gates, and customer-controlled model policies.

## 18. 45-minute interview walkthrough

Allocate 5 minutes to requirements, 5 to storage math, 10 to upload/sync, 10 to metadata and chunk durability, 5 to sharing/ACLs, 5 to RAG safety, and 5 to failures and trade-offs.

## 19. Follow-up questions and key takeaways

How do renames sync cheaply? When can chunks be deleted? How do ACL changes invalidate embeddings? The central separation is immutable bulk data versus transactional metadata; AI-derived indexes are disposable projections that never outrank authorization.

## 20. References

- [Model Context Protocol 2026 updates](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
