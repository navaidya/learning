# Senior Coding Interview Track — Product & Engineering Specification

## Summary

Create a standalone Senior Coding Interview learning area in the AI Infrastructure Learning OS. The area is an independent library of hands-on Java and Python coding and microservices labs. Learners choose their own order; the site provides discoverability, context, runnable lab links, and interview-oriented review prompts without changing the existing System Design, Knowledge Book, Labs, Projects, Inbox, or News pages.

The new primary navigation becomes:

Dashboard → Skill Map → System Design → Coding Interviews → Knowledge Book → Labs → Projects → Inbox → News

The canonical catalog route is `/coding-interviews`. Each catalog entry links to `/coding-interviews/[slug]`, where Markdown-backed guidance is paired with runnable code under `coding-labs/`.

## Goals

- Give senior backend candidates a focused, independently browsable interview library.
- Make every exercise implementable and testable in Java and/or Python.
- Connect algorithmic coding to production concerns such as concurrency, idempotency, retries, queues, observability, and failure handling.
- Keep the site static-first and Git-backed.
- Preserve existing pages and content contracts.

## Non-goals

- No browser-based IDE or code execution service.
- No backend, authentication, database, LLM integration, or hosted code runner.
- No replacement of the existing `/labs` area; this is a focused interview-preparation library that links to runnable repository labs.
- No claim that any architecture represents a company’s internal implementation.

## Catalog and routes

Create:

- `src/pages/coding-interviews/index.astro` — catalog page using the new collection.
- `src/pages/coding-interviews/[slug].astro` — detail page for one interview lab.
- `src/components/coding-interviews/CodingInterviewCard.astro` — reusable catalog card.
- `src/styles/coding-interviews.css` — responsive catalog/detail styling.
- `content/coding-interviews/*.md` — one Markdown entry per lab.

Update only:

- `src/layouts/BaseLayout.astro` — add `Coding Interviews` after `System Design` in the primary navigation.
- `src/content.config.ts` — add the typed `coding-interviews` collection.
- focused tests for collection, route metadata, links, and lab contracts.

All internal links use `withBase()` so GitHub Pages repository bases continue to work.

## Collection contract

The `coding-interviews` collection metadata must include:

- `title: string`
- `summary: string`
- `order: integer >= 1`
- `difficulty: beginner | intermediate | advanced`
- `estimatedMinutes: integer 15–180`
- `categories: string[]` with at least one value
- `languages: ('java' | 'python')[]` with at least one value
- `skills: string[]` with at least one value
- `labPath: string` pointing to a directory under `coding-labs/`
- `status: planned | ready | in_progress | completed`, default `planned`
- `tags: string[]`, default `[]`

The catalog must contain exactly eight uniquely slugged entries in display order:

1. `hashmaps-sliding-window`
2. `lru-ttl-cache`
3. `token-bucket-rate-limiter`
4. `bounded-producer-consumer`
5. `retry-timeout-jitter`
6. `idempotent-order-api`
7. `outbox-event-workflow`
8. `microservice-observability-failure-lab`

## Lab content contract

Every Markdown entry must contain these sections:

- Interview prompt
- What you will build
- Requirements and constraints
- Suggested API or interface
- Starter-to-solution checkpoints
- Java and/or Python implementation notes
- Test cases and edge cases
- Complexity and resource analysis
- Concurrency and failure behavior
- Production extension questions
- Interview explanation checklist
- References

Each entry must link to its declared `coding-labs/<slug>/` directory using a base-safe route or repository-relative code link appropriate for static GitHub Pages.

## Runnable lab contract

Each lab directory contains:

```text
coding-labs/<slug>/
  README.md
  java/
    README.md
    src/main/java/...
    src/test/java/...
  python/
    README.md
    src/...
    tests/...
```

Language directories are required when listed in collection metadata. Every language implementation must include a runnable test command in its README and deterministic tests for normal, boundary, duplicate, timeout, and failure cases where applicable.

The first implementation may use standard-library Java and Python only. Framework dependencies are not required for algorithmic labs. Microservice labs should provide a framework-neutral core implementation plus clear Spring Boot/FastAPI production-extension notes rather than adding runtime services to the Astro application.

## Initial lab emphasis

- Hash maps/sliding windows: communication, invariants, complexity, and edge cases.
- LRU/TTL cache: eviction, expiration, concurrency, and memory bounds.
- Token bucket: rate mathematics, clock handling, burst behavior, and thread safety.
- Bounded producer/consumer: backpressure, shutdown, fairness, and cancellation.
- Retry executor: timeout budgets, exponential backoff, jitter, retry classification, and idempotency.
- Idempotent order API: request keys, state transitions, duplicate delivery, and durable ownership.
- Outbox workflow: transaction boundaries, event publication, replay, and consumer deduplication.
- Observability/failure lab: structured logs, metrics, tracing, health states, dependency failure, and recovery.

## Testing and quality gates

Write tests before implementation for:

- Exactly eight ordered, uniquely slugged collection entries.
- Required metadata types and non-empty arrays.
- Required Markdown headings in every entry.
- Declared `labPath` existence and language-directory presence.
- Catalog/detail links using the configured base path.
- Primary navigation placement.
- Runnable Java and Python test commands for each declared language.

Run:

- `npm test`
- `npm run build`
- Every Java lab test command.
- Every Python lab test command.

Existing tests and routes must remain green. No existing System Design or Knowledge Book content is modified by this feature.

## Assumptions

- The learner chooses the order; the catalog does not impose a sequential curriculum.
- Progress tracking can initially use collection metadata and visible lab status; no new persistence layer is introduced.
- Java and Python versions follow the repository/runtime environment and are documented in each lab README.
- The repository’s configured corporate dependency controls remain unchanged.
- Large generated artifacts, build outputs, virtual environments, and media remain ignored and are not committed.
