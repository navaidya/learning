# Senior Coding Interview Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent `/coding-interviews` library with eight runnable Java/Python senior-backend interview labs while preserving all existing pages and content.

**Architecture:** Add a typed Astro `coding-interviews` collection backed by eight Markdown lab guides, a catalog/detail route pair, a reusable card, and isolated responsive styles. Keep runnable exercises outside Astro under `coding-labs/<slug>/`, using standard-library Java and Python with deterministic test commands. Update only the shared primary navigation, content schema, new track files, focused tests, and the required Git ignore rule for generated lab artifacts.

**Tech Stack:** Astro content collections, TypeScript, Astro static routes, Markdown, Java standard library, Python standard library and `unittest`, Vitest, shell/JDK tooling already available in the repository environment.

## Global Constraints

- Learners choose lab order; the catalog must not impose sequencing.
- Existing System Design, Knowledge Book, Labs, Projects, Inbox, and News routes/content remain unchanged.
- All internal site links use `withBase()` from `src/lib/url.ts`.
- No backend, authentication, database, hosted code runner, LLM integration, or new runtime dependency.
- Each declared language has a runnable lab README and deterministic tests.
- Java and Python implementations use standard libraries only for the first version.
- Preserve configured corporate dependency controls; never change registries or add bypass flags.
- Generated build output, virtual environments, compiled classes, and caches must not be committed.

---

### Task 1: Add failing content, route, and runnable-lab contract tests

**Files:**
- Create: `tests/coding-interviews/content-contract.test.ts`
- Create: `tests/coding-interviews/routes-contract.test.ts`
- Create: `tests/coding-interviews/lab-contract.test.ts`
- Read: `src/content.config.ts`, `src/layouts/BaseLayout.astro`, `src/lib/url.ts`

**Interfaces:**
- Tests consume `content/coding-interviews/*.md`, `coding-labs/<slug>/`, and source route/layout files.
- Tests produce deterministic failures until the collection, eight entries, routes, navigation item, required headings, and language directories exist.

- [ ] **Step 1: Write the catalog contract test**

  Assert that the Markdown files have exactly these sorted slugs and orders:

  ```ts
  const expected = [
    'hashmaps-sliding-window', 'lru-ttl-cache',
    'token-bucket-rate-limiter', 'bounded-producer-consumer',
    'retry-timeout-jitter', 'idempotent-order-api',
    'outbox-event-workflow', 'microservice-observability-failure-lab',
  ];
  expect(files.map(stripMarkdown)).toEqual(expected);
  expect(entries.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  ```

  Validate non-empty `title`, `summary`, `categories`, `languages`, `skills`, `labPath`, and valid difficulty/status values; reject duplicate slugs and duplicate order values.

- [ ] **Step 2: Write the Markdown-section contract test**

  Require every guide to contain these exact H2 headings: `Interview prompt`, `What you will build`, `Requirements and constraints`, `Suggested API or interface`, `Starter-to-solution checkpoints`, `Java and/or Python implementation notes`, `Test cases and edge cases`, `Complexity and resource analysis`, `Concurrency and failure behavior`, `Production extension questions`, `Interview explanation checklist`, and `References`.

- [ ] **Step 3: Write the route and navigation contract test**

  Read `src/layouts/BaseLayout.astro` and assert that `['/coding-interviews','Coding Interviews']` appears after the System Design entry and before Knowledge Book. Assert the catalog and detail route files exist and contain `withBase` usage for internal links.

- [ ] **Step 4: Write the runnable-lab contract test**

  For each guide, resolve `labPath` and assert `README.md` exists. For each declared language, assert the directory contains `README.md` plus at least one source file and one test file. Assert each language README includes a concrete command (`python -m unittest`, `javac`, or `java`) and a cleanup note.

- [ ] **Step 5: Run the focused tests to verify the red phase**

  Run: `npm test -- tests/coding-interviews`

  Expected: FAIL because the new collection, routes, content, and lab directories do not yet exist.

### Task 2: Add the typed collection, navigation entry, and route shells

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/pages/coding-interviews/index.astro`
- Create: `src/pages/coding-interviews/[slug].astro`
- Create: `src/components/coding-interviews/CodingInterviewCard.astro`
- Create: `src/styles/coding-interviews.css`
- Test: `tests/coding-interviews/routes-contract.test.ts`

**Interfaces:**
- Collection name: `coding-interviews`.
- Entry metadata: `{ title, summary, order, difficulty, estimatedMinutes, categories, languages, skills, labPath, status, tags }`.
- Catalog route gets `getCollection('coding-interviews')`, sorts by `order`, and links with `withBase(`/coding-interviews/${entry.id}`)`.
- Detail route uses `getStaticPaths()`, renders the Markdown `Content`, and links back to the catalog and declared lab path.

- [ ] **Step 1: Extend `src/content.config.ts` with the collection schema**

  Add an object schema matching the spec; use `z.array(...).min(1)` for categories, languages, and skills; constrain `estimatedMinutes` to 15–180; default status to `planned` and tags to `[]`.

- [ ] **Step 2: Add the navigation item**

  Insert `['/coding-interviews', 'Coding Interviews']` between System Design and Knowledge Book in the existing `nav` array. Do not alter any other labels or order.

- [ ] **Step 3: Build the catalog route**

  Render a page title, explanation that entries are independent, a count, and a responsive grid of `CodingInterviewCard` components. Pass only collection data to the card; do not hard-code lab facts in the component.

- [ ] **Step 4: Build the detail route**

  Render title, summary, difficulty, estimated time, language badges, category/skill tags, a runnable-lab link, Markdown content, and previous/next links based on sorted order. Use `withBase()` for all internal links and `Astro.url` only for non-link metadata.

- [ ] **Step 5: Add scoped responsive styles**

  Import `coding-interviews.css` from the new routes or global layout. Define a grid using `minmax(min(100%, 300px), 1fr)`, readable metadata badges, focus-visible states, and a one-column mobile layout without changing existing style selectors.

- [ ] **Step 6: Run focused tests and Astro type checking**

  Run: `npm test -- tests/coding-interviews`

  Expected: route/schema tests still fail only because content/lab fixtures are absent; route source and navigation assertions pass.

### Task 3: Add the eight Markdown lab guides

**Files:**
- Create: `content/coding-interviews/hashmaps-sliding-window.md`
- Create: `content/coding-interviews/lru-ttl-cache.md`
- Create: `content/coding-interviews/token-bucket-rate-limiter.md`
- Create: `content/coding-interviews/bounded-producer-consumer.md`
- Create: `content/coding-interviews/retry-timeout-jitter.md`
- Create: `content/coding-interviews/idempotent-order-api.md`
- Create: `content/coding-interviews/outbox-event-workflow.md`
- Create: `content/coding-interviews/microservice-observability-failure-lab.md`
- Test: `tests/coding-interviews/content-contract.test.ts`

**Interfaces:**
- Each guide frontmatter satisfies the `coding-interviews` collection schema.
- Each guide declares `labPath: coding-labs/<slug>` and languages `['java','python']`.
- Each guide provides the exact twelve contract headings and links to its runnable code directory.

- [ ] **Step 1: Write the eight frontmatter blocks**

  Use orders 1–8, honest difficulty and time estimates, both languages for every lab, category labels from `coding`, `concurrency`, `microservices`, and `reliability`, and status `ready` only after its runnable tests exist.

- [ ] **Step 2: Write each interview prompt and build target**

  State the user-facing problem, the success behavior, and the production extension. Include the senior-level question the interviewer is testing rather than naming a technology as the answer.

- [ ] **Step 3: Write requirements, APIs, checkpoints, and edge cases**

  Include concrete method/API shapes, normal/boundary/duplicate/failure cases, and a staged progression from a correct baseline to concurrency or distributed-system concerns. Ensure the idempotency, outbox, and observability guides distinguish local core behavior from production deployment concerns.

- [ ] **Step 4: Write complexity, failure, and interview explanation sections**

  Require time/space analysis, consistency and concurrency implications, failure recovery, and a concise five-minute explanation checklist for each lab.

- [ ] **Step 5: Run the content contract test**

  Run: `npm test -- tests/coding-interviews/content-contract.test.ts`

  Expected: PASS for eight files, metadata, headings, and unique ordered slugs; runnable-lab assertions remain red until Task 4.

### Task 4: Implement the Java and Python lab cores and deterministic tests

**Files:**
- Create: `coding-labs/<slug>/README.md` for all eight labs
- Create: `coding-labs/<slug>/java/README.md`, `src/main/java/...`, `src/test/java/...` for all eight labs
- Create: `coding-labs/<slug>/python/README.md`, `src/...`, `tests/...` for all eight labs
- Modify: `.gitignore` only if required for compiled Java classes or Python caches
- Test: `tests/coding-interviews/lab-contract.test.ts`

**Interfaces:**
- Java tests run with the standard toolchain documented in each README; no Maven/Gradle dependency is required for the core labs.
- Python tests run with `python3 -m unittest discover -s tests -v` from each lab’s `python/` directory.
- Every implementation exposes a small named core API and has tests for normal, boundary, duplicate, and failure behavior.

- [ ] **Step 1: Create the shared lab README contract**

  Each lab README must state the goal, prerequisites, exact Java/Python commands, expected result, and cleanup (`find . -name '*.class' -delete` for Java; no virtual environment or generated files required for Python).

- [ ] **Step 2: Implement the algorithmic labs**

  Implement and test:

  - `hashmaps-sliding-window`: longest unique substring or equivalent window API in Java and Python.
  - `lru-ttl-cache`: bounded LRU map with injectable clock for deterministic TTL tests.
  - `token-bucket-rate-limiter`: refill-rate/capacity model with injectable clock and atomic decision API.
  - `bounded-producer-consumer`: bounded queue with blocking/timeout behavior and deterministic shutdown.

- [ ] **Step 3: Implement the reliability labs**

  Implement and test:

  - `retry-timeout-jitter`: retry policy that classifies retryable failures and honors a maximum attempt/time budget using injected sleeper/clock seams.
  - `idempotent-order-api`: in-memory state machine keyed by idempotency key, rejecting conflicting payload reuse and safely replaying duplicates.
  - `outbox-event-workflow`: transactional-looking in-memory aggregate/outbox boundary with idempotent publication and consumer deduplication.
  - `microservice-observability-failure-lab`: framework-neutral request pipeline that emits structured events/metrics and models timeout, dependency failure, and recovery states.

- [ ] **Step 4: Add Java tests before declaring each lab ready**

  Use plain assertion-based test runners or the JDK’s available test tooling. Each test must cover at least one empty/input-boundary case, one normal case, one duplicate or repeated call, and one failure/timeout/concurrency case where the lab supports it.

- [ ] **Step 5: Add Python `unittest` suites**

  Use deterministic fake clocks, sleepers, and dependencies. Tests must not call the network, sleep for real backoff durations, create threads that outlive the test, or write outside the lab directory.

- [ ] **Step 6: Run every lab command**

  Run each Python README command and each Java README command from its stated directory. Expected: all tests pass without third-party dependencies.

### Task 5: Complete links, styling, and route behavior tests

**Files:**
- Modify: `src/pages/coding-interviews/index.astro`
- Modify: `src/pages/coding-interviews/[slug].astro`
- Modify: `src/components/coding-interviews/CodingInterviewCard.astro`
- Modify: `src/styles/coding-interviews.css`
- Modify: `tests/coding-interviews/routes-contract.test.ts`

**Interfaces:**
- Catalog links resolve to all eight detail slugs under the configured `withBase` prefix.
- Detail pages expose a runnable lab link, all metadata, and previous/next links without assuming a root `/` base.

- [ ] **Step 1: Add route-level link assertions**

  Test the source for `withBase('/coding-interviews')`, `withBase(`/coding-interviews/${...}`)`, and a repository-relative lab link strategy; reject hard-coded root-relative internal links.

- [ ] **Step 2: Add empty/single/eight-entry rendering guards**

  Ensure the catalog sorts by `order`, displays all entries, and does not assume a fixed grid row count. Ensure the detail page handles first and last entries without rendering invalid previous/next links.

- [ ] **Step 3: Verify mobile and keyboard states**

  Check the CSS for one-column layout below 480px, visible focus styles, readable badge contrast, and no fixed-width overflow.

- [ ] **Step 4: Run route and content tests**

  Run: `npm test -- tests/coding-interviews`

  Expected: PASS for all new contracts and no regressions in existing tests.

### Task 6: Full verification and handoff

**Files:**
- Create: `/private/tmp/senior-coding-interview-track-qa.txt`
- Read: all new content, code, route, and test files

- [ ] **Step 1: Run the complete Java and Python lab matrix**

  Execute all sixteen language lab commands and record the command/output summary in the QA file.

- [ ] **Step 2: Run application tests and build**

  Run: `npm test`

  Run: `npm run build`

  Expected: all existing and new tests pass; Astro build emits `/coding-interviews/` and eight detail routes.

- [ ] **Step 3: Verify GitHub Pages base-path behavior**

  Build with the configured repository base and inspect generated catalog/detail HTML for base-prefixed links to all eight entries and runnable lab links.

- [ ] **Step 4: Verify Git safety**

  Run `git status --short` and confirm no `.class`, `__pycache__`, `.venv`, coverage, or build output is tracked.

- [ ] **Step 5: Commit the implementation**

  Use focused commits for schema/routes, content, lab implementations, and tests. Do not commit generated artifacts.
