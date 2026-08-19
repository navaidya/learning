# System Design Deployment Architecture Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the approved mobility pilot to all 24 System Design entries with explicit requirements, self-explaining logical diagrams, and one cloud-neutral deployment child page per entry.

**Architecture:** Preserve the existing typed collection, generic child route, layouts, and base-safe navigation. Strengthen the content contracts from a single pilot to one-to-one catalog validation, then author the remaining parent upgrades and deployment documents in architecture-family batches while keeping every Markdown page case-specific and independently readable.

**Tech Stack:** Astro content collections, TypeScript, Markdown, Mermaid 11, Vitest, existing static CSS and GitHub Pages base-path utilities

**Spec:** `docs/superpowers/specs/2026-08-18-system-design-deployment-architecture-design.md`

## Global Constraints

- Cover exactly the 24 entries in `content/system-design`, including a reusable deployment worksheet for `00-system-design-template`.
- Keep every architecture cloud-neutral and suitable for general senior system-design interviews.
- Preserve all existing parent URLs and content; no backend, hosted service, or new dependency.
- Every deployment page has the 17 required numbered sections, two accessible Mermaid diagrams, inventory, failure, RPO/RTO, deterministic AI fallback, walkthrough, and capability mapping.
- Every parent page has explicit functional/non-functional tables, scope/assumption prose, visible diagram role phrases, and context/container role tables.
- Kubernetes control planes remain outside customer request paths; managed state remains outside workload clusters unless explicitly justified.
- Do not bypass corporate registry, certificate, or dependency security controls.

---

### Task 1: Generalize rollout contracts

**Files:**
- Modify: `tests/system-design/deployment-content-contract.test.ts`
- Modify: `tests/system-design/content-contract.test.ts`

**Interfaces:**
- Consumes: filenames and frontmatter from both System Design collections.
- Produces: one-to-one, order, section, diagram, requirements, and Markdown-link contracts for all 24 entries.

- [ ] Replace the pilot-only deployment assertion with a loop over the exact catalog slugs.
- [ ] Assert deployment filename, `systemDesign`, order, metadata, 17 headings, accessible diagrams, inventory, three failures, RPO/RTO, deterministic fallback, and safe links for every document.
- [ ] Replace the mobility-only parent assertion with the same requirements/role-table/visible-role contract for every parent.
- [ ] Run `npx vitest run tests/system-design/deployment-content-contract.test.ts tests/system-design/content-contract.test.ts` and verify failures identify the 23 missing deployments and parent upgrades.

### Task 2: Upgrade the template and original AI-native parents

**Files:**
- Modify: `content/system-design/00-system-design-template.md`
- Modify: `content/system-design/02-ai-native-url-shortener.md` through `07-ai-native-delivery-marketplace.md`

**Interfaces:**
- Consumes: existing requirements and first two Mermaid diagrams.
- Produces: explicit requirement tables, scope/assumption blocks, visible role phrases, and component-role tables without removing later interview content.

- [ ] Add case-specific functional and measurable non-functional tables.
- [ ] Add explicit exclusions and assumptions.
- [ ] Rewrite context/container node labels with concise `<br/>` role phrases and add readable role tables.
- [ ] Run the parent content contract and verify this batch passes while later batches remain red.

### Task 3: Upgrade infrastructure and platform parents

**Files:**
- Modify: `content/system-design/08-rate-limiter.md` through `15-notification-system.md`

**Interfaces:** Same parent contract as Task 2.

- [ ] Upgrade rate limiter, distributed cache, message queue, observability, video streaming, crawler, autocomplete, and notification designs.
- [ ] Preserve capacity calculations and keep diagram roles specific to each system’s critical path.
- [ ] Run the parent content contract and verify only the final parent batch remains red.

### Task 4: Upgrade transactional, collaboration, and AI parents

**Files:**
- Modify: `content/system-design/16-ecommerce-platform.md` through `23-llm-search-rag.md`

**Interfaces:** Same parent contract as Task 2.

- [ ] Upgrade commerce, payments, ticketing, travel, collaboration, orchestration, feature-store, and RAG designs.
- [ ] Make correctness, tenancy/ACLs, safety boundaries, and deterministic AI fallbacks explicit where relevant.
- [ ] Run the parent content contract and verify all 24 parents pass.

### Task 5: Author all remaining deployment pages

**Files:**
- Create: `content/system-design-deployments/00-system-design-template.md`
- Create: `content/system-design-deployments/02-ai-native-url-shortener.md` through `23-llm-search-rag.md`

**Interfaces:**
- Consumes: parent slug/order and the case emphasis defined in the approved specification.
- Produces: exactly 24 one-to-one deployment documents consumed by the existing static child route.

- [ ] Author the template worksheet and six original AI-native product deployments.
- [ ] Author the eight infrastructure/platform deployments.
- [ ] Author the eight transactional/collaboration/AI deployments.
- [ ] Give each page a physical/runtime topology, critical path, inventory, scaling math, network/security boundaries, zonal placement, release/operations, RPO/RTO, failure table, AI degradation path, trade-offs, narration, and cloud capability map.
- [ ] Run the deployment content and route contracts and verify all 24 child routes are represented.

### Task 6: Full verification and visual review

**Files:**
- Modify only if verification finds a defect: rollout files above or shared deployment styles/layouts.

**Interfaces:**
- Consumes: complete parent and deployment collections.
- Produces: production-build and browser evidence for the full rollout.

- [ ] Run `npm test`.
- [ ] Run `GITHUB_REPOSITORY=navaidya/learning npm run build` and confirm all 24 `/deployment` routes are generated.
- [ ] Inspect representative edge, realtime, transactional, collaboration, and AI deployment pages at desktop and 320px widths; render Mermaid and exercise zoom controls.
- [ ] Run `git diff --check` and confirm no generated artifacts or unrelated changes are included.
