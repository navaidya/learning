# Micronaut Interview Preparation Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one detailed Micronaut interview-preparation article to the existing Knowledge Book.

**Architecture:** Use the existing `book` Astro content collection and catch-all book route. The page is one Markdown document with frontmatter accepted by the existing `common` schema, Mermaid diagrams rendered by the existing layout, and official documentation links.

**Tech Stack:** Astro content collection, Markdown, Mermaid fences, TypeScript/Vitest, Micronaut 4.9.10 official documentation.

## Global Constraints

- Preserve existing user-authored material.
- Build static-first; add no backend, database, authentication, LLM integration, or third-party hosted service.
- Build internal links with `withBase()`; this page only needs external documentation links.
- Do not add runtime dependencies.
- Keep examples generic and do not expose LARSCP project-specific names or implementation details.

### Task 1: Add the Knowledge Book article

**Files:**
- Create: `content/book/24-micronaut-interview-preparation.md`
- Test: `tests/book/content-contract.test.ts` only if a focused contract is needed; otherwise run the existing book/content tests.

**Interfaces:**
- Consumes: the existing `book` collection frontmatter fields `title`, `domain`, and `tags`.
- Produces: one rendered book entry at `/book/24-micronaut-interview-preparation`.

- [ ] **Step 1: Add frontmatter and the interview framing**

Use `title: Micronaut Interview Preparation`, `domain: JVM Services`, and tags covering Micronaut, Java, dependency injection, configuration, testing, and microservices. Explain the five-minute interview answer and why compile-time metadata, low reflection, and explicit boundaries matter.

- [ ] **Step 2: Add the configuration-to-object walkthrough**

Show `application.yml`, a typed `@ConfigurationProperties("service.catalog")` Java class, constructor injection into a client/service, and a test `PropertySource`. Explain normalization, type conversion (`URI`, `Duration`, `boolean`, `int`), validation, precedence, startup failure, and refreshable versus startup-only configuration. Distinguish `@Value`, `@ConfigurationProperties`, `@EachProperty`, `@EachBean`, and `@Requires`.

- [ ] **Step 3: Add generic architecture and request-flow diagrams**

Include Mermaid diagrams showing `Property Sources → Environment → compile-time binding → typed bean → constructor injection` and `Client → Filter → Controller → Service → HTTP Client/Repository/Publisher`, with blocking work dispatched away from event-loop threads.

- [ ] **Step 4: Add senior interview sections and references**

Cover HTTP controllers/clients, validation and error handling, testing with `@MicronautTest`, security, observability, messaging, resilience, Spring comparison, debugging questions, production trade-offs, and a checklist. Include links to official 4.9.10 guide/API pages only.

- [ ] **Step 5: Verify and commit**

Run the existing direct Vitest command and `npm test`/`npm run build` when dependencies are available. Confirm only the new article/spec/plan files changed, then commit with `docs: add Micronaut interview preparation page`.

