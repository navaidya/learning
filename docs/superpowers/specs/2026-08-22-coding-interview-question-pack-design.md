# Company-Neutral Coding Interview Question Pack — Design

## Purpose

Turn the supplied interview questions and evaluator notes into original, publicly shareable learning material for the existing Senior Coding Interview Library. The result must help a learner practice both implementation and explanation without reproducing company-specific leveling language, proprietary rubrics, or reference text.

## Scope

Add four independent guide pages beneath `/coding-interviews/`, each backed by a self-contained Java and Python lab:

1. **Senior Engineering Technical Screen** — communicating expertise, programming and secure-coding principles, API design, large-scale architecture, SaaS design, cloud migration, and data-platform reasoning.
2. **First-Occurrence Binary Search** — finding the leftmost matching value in a sorted sequence, including duplicates, boundary cases, overflow-safe midpoint calculation, variants, and follow-up reasoning.
3. **Merge K Sorted Lists** — comparing flatten-and-sort, repeated minimum selection, sequential merge, pairwise divide-and-conquer, and min-heap solutions.
4. **Low-Latency Autosuggest** — designing and implementing a bounded suggestion engine while reasoning about a distributed production architecture.

The existing eight guides and labs remain unchanged. The four additions appear after them in the current catalog and can be taken in any order.

## Public-Safety and Editorial Rules

- Rewrite all material in original, company-neutral language.
- Use `mid-level`, `senior`, and `staff-level` only as general signals, not as mappings to a particular employer's career framework.
- Do not identify or imply a source company, internal interview process, hiring threshold, or scorecard.
- Treat the supplied material as prompts to analyze, not authoritative technical documentation.
- Correct ambiguous or inaccurate claims. For example, with `N` total nodes across `k` lists, heap merging is `O(N log k)`, and binary search fundamentally requires sorted random-access data rather than necessarily contiguous physical memory.
- Use primary public references only.

## Catalog and Routing

Reuse the current `coding-interviews` Astro content collection and routes:

- Catalog: `/coding-interviews/`
- Detail: `/coding-interviews/[slug]/`
- Runnable source: `coding-labs/<slug>/`

New slugs and display order:

| Order | Slug | Difficulty | Target time |
| --- | --- | --- | --- |
| 9 | `senior-technical-screen` | advanced | 90 minutes |
| 10 | `first-occurrence-binary-search` | intermediate | 60 minutes |
| 11 | `merge-k-sorted-lists` | advanced | 75 minutes |
| 12 | `low-latency-autosuggest` | advanced | 120 minutes |

No new route, runtime dependency, backend, database, or hosted service is required. All internal links remain base-path safe through the existing route components.

## Shared Guide Contract

Each Markdown guide keeps the twelve established headings so it renders through the existing detail page and passes the content contract:

1. Interview prompt
2. What you will build
3. Requirements and constraints
4. Suggested API or interface
5. Starter-to-solution checkpoints
6. Java and/or Python implementation notes
7. Test cases and edge cases
8. Complexity and resource analysis
9. Concurrency and failure behavior
10. Production extension questions
11. Interview explanation checklist
12. References

Within that contract, every page also includes:

- clarifying questions to ask before coding;
- evaluation signals at mid-level, senior, and staff depth where useful;
- approach comparison and explicit selection criteria;
- embedded Java and Python sample code;
- a timed walkthrough for explaining the solution;
- common mistakes and corrections;
- a link to its runnable lab.

## Page Designs

### Senior Engineering Technical Screen

This is an answer-building and communication lab rather than a list of memorized definitions. It provides reusable structures for concise answers:

- expertise: context, depth, evidence, impact, and lessons;
- programming: correctness, readability, security, testing, concurrency, and operability;
- API design: consumer-first contract, resource model, validation, idempotency, pagination, errors, evolution, authentication, authorization, rate limits, and observability;
- architecture: requirements, estimates, boundaries, data, consistency, failure modes, security, operations, and trade-offs;
- SaaS, migration, and data-platform prompts as structured follow-ups.

Its runnable lab implements a small idempotent command handler with input validation and deterministic outcomes. Java and Python tests demonstrate duplicate handling, malformed requests, and dependency failure without requiring a web framework.

### First-Occurrence Binary Search

The recommended iterative algorithm records a match and continues left. The guide proves the loop invariant, uses an overflow-safe midpoint, and distinguishes a leftmost-match implementation from a binary search that may return any match.

The lab covers null/empty input policy, all-equal input, absent keys, endpoint matches, duplicates, negative numbers, and large logical bounds. Java and Python expose equivalent APIs and tests. Recursive search and the local-minimum follow-up are discussed, but the production reference implementation remains iterative and minimal.

### Merge K Sorted Lists

The guide defines `N` as the total number of nodes and `k` as the number of lists. It compares approaches using consistent notation and recommends a min-heap for streaming one node per list, while explaining when pairwise merging is competitive.

The lab implements a min-heap merge in both languages with deterministic tie-breaking. Tests cover zero lists, empty lists, duplicates, negative values, one list, mixed empty lists, and preservation of sorted output. Inputs are treated as caller-owned; the output contract states whether nodes are reused or copied.

### Low-Latency Autosuggest

The guide begins with latency, scale, freshness, locality, personalization, safety, and result-shape questions. It separates the request path from the offline/streaming build path and explains prefix indexes, cached top results, partitioning, regional deployment, edge caching, client prefetching, stale-result handling, cancellation, moderation, and metrics.

The runnable lab is deliberately bounded: an in-memory top-k prefix index with normalized input, deterministic popularity ranking, tie-breaking, result limits, and no network dependency. It demonstrates the core data-structure and API decisions without claiming to model the full distributed system.

## Java and Python Lab Structure

Each directory under `coding-labs/` contains:

- `README.md` with exact commands from the repository root;
- dependency-free Java source plus an assertion-based test runner compatible with JDK 17;
- dependency-free Python source plus `unittest` tests;
- equivalent externally observable behavior across languages;
- no generated artifacts committed to Git.

The examples favor standard-library code so corporate registry, certificate, and dependency controls remain untouched.

## Error Handling and Contracts

- Validate public inputs at the boundary and document null/`None`, empty, invalid, and oversized behavior.
- Prefer deterministic exceptions or result values over logging-and-continuing silently.
- Do not expose mutable internal state from the labs.
- Keep concurrency claims proportional to implementation: pure or locally owned state can be thread-safe by construction; mutable indexes or stores must state their synchronization boundary.
- Production extensions must distinguish what the lab actually implements from what a real service would require.

## Testing

Develop test-first and update the existing contracts before adding content or implementations.

Automated checks will verify:

- exactly twelve ordered, unique coding-interview entries;
- valid metadata, both languages, safe direct `coding-labs/<slug>` paths, and all required headings;
- presence of Java and Python embedded examples in each new guide;
- existence of every declared lab directory and its documented commands;
- behavior and edge cases for all eight new language implementations/test runners;
- catalog/detail links remain derived from collection data and base-path safe;
- no regressions to existing site routes or existing eight labs.

Completion verification:

1. Run all four Java lab commands.
2. Run all four Python lab commands.
3. Run `npm test`.
4. Run `npm run build` with the repository base-path environment used by GitHub Pages.
5. Inspect the generated catalog and representative detail pages for readability and mobile overflow.

If the configured dependency environment prevents the Astro commands, report the exact environmental blocker without changing registries, disabling certificate verification, or bypassing Oracle development controls.

## Non-Goals

- Reproducing a particular company's interview process or hiring rubric.
- Adding scoring, authentication, saved progress, an online code runner, or an interactive IDE.
- Building a production autosuggest service.
- Introducing Spring, Micronaut, FastAPI, or other framework dependencies into these focused algorithm labs.
- Changing existing Knowledge Book, System Design, Labs, Projects, Inbox, or News behavior.
