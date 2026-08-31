# Knowledge Book Topic Hubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the progress-oriented dashboard and flat Knowledge Book into a knowledge-first dashboard and reusable topic hubs without changing canonical note URLs.

**Architecture:** Derive an in-memory book index from Astro book entries and a small local topic-catalog definition. Notes declare optional cross-cutting `topics`; `domain` remains the fallback. Astro renders the dashboard, book index, topic routes, and note navigation from that derived model, with presentational components receiving only view data.

**Tech Stack:** Astro static routes, TypeScript, Astro content collections, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-08-31-knowledge-book-topic-hubs-design.md`

## Global Constraints

- Preserve every existing `content/book` Markdown file and `/book/<id>` route.
- Do not add dependencies, a backend, a database, client-side search, or progress tracking to the redesigned dashboard.
- Keep content classifications in `data/` or focused deterministic library modules; do not hard-code them in UI components.
- Build all internal links with `withBase()`.
- Keep pages semantic, keyboard accessible, responsive, and readable without JavaScript.
- Run `npm test` and `npm run build` before claiming completion.

---

## File Structure

- Create `data/book-topics.yaml`: display names, descriptions, dashboard order, and Start Here note ids.
- Create `src/lib/bookIndex.ts`: pure types and functions for normalizing topics, resolving memberships, and constructing deterministic hub/note view models.
- Create `src/lib/bookTopics.ts`: parse the local YAML catalog and expose typed topic metadata.
- Create `src/components/book/TopicHubCard.astro`: semantic link card for a topic hub.
- Create `src/components/book/BookNoteCard.astro`: canonical note card with topic pills.
- Create `src/components/book/TopicPills.astro`: reusable hub links for a note.
- Modify `src/content.config.ts`: permit optional `topics` and `published` book frontmatter.
- Modify `src/lib/content.ts`: load Astro entries and return the dashboard/book/hub view models using the pure index.
- Modify `src/pages/index.astro`, `src/pages/book/index.astro`, and `src/pages/book/[...slug].astro`: render knowledge-first views and contextual hub navigation.
- Create `src/pages/book/topics/[topic].astro`: statically generated topic pages.
- Modify `src/styles/global.css`: add topic-grid, note-card, and topic-pill styles plus small-screen behavior.
- Modify `content/book/15-aiops-kubernetes-troubleshooting.md`: add explicit dual membership.
- Create `tests/lib/bookIndex.test.ts`: unit tests for the pure index.
- Create `tests/book/routes-contract.test.ts`: source-level contracts for the new routes and base-path links.

### Task 1: Topic Catalog and Pure Index

**Files:**
- Create: `data/book-topics.yaml`
- Create: `src/lib/bookTopics.ts`
- Create: `src/lib/bookIndex.ts`
- Test: `tests/lib/bookIndex.test.ts`

**Interfaces:**
- Produces `TopicCatalogEntry`, `BookIndexEntry`, `TopicHub`, `createBookIndex(entries, catalog)`, and `getTopicsForEntry(entry)`.
- Consumes plain entry-shaped objects only; it must not import `astro:content` so Vitest can run it directly.

- [ ] **Step 1: Write the failing book-index tests**

```ts
import { describe, expect, it } from 'vitest';
import { createBookIndex } from '../../src/lib/bookIndex';

const catalog = [
  { slug: 'kubernetes', title: 'Kubernetes', description: 'Cluster architecture and operations.', featured: 1 },
  { slug: 'aiops', title: 'AIOps', description: 'Evidence-led operational assistance.', featured: 2 },
];

describe('createBookIndex', () => {
  it('lists a note in each explicit topic without duplicating it within a hub', () => {
    const index = createBookIndex([{ id: 'ai-troubleshooting', data: { title: 'AI troubleshooting', topics: ['aiops', 'kubernetes', 'aiops'] } }], catalog);
    expect(index.hubs.map((hub) => [hub.slug, hub.entries.map((entry) => entry.id)])).toEqual([
      ['aiops', ['ai-troubleshooting']], ['kubernetes', ['ai-troubleshooting']],
    ]);
  });

  it('uses domain when a note has no explicit topics and orders notes by title', () => {
    const index = createBookIndex([
      { id: 'z', data: { title: 'Zulu', domain: 'kubernetes' } },
      { id: 'a', data: { title: 'Alpha', domain: 'kubernetes' } },
    ], catalog);
    expect(index.hubs.find((hub) => hub.slug === 'kubernetes')?.entries.map((entry) => entry.id)).toEqual(['a', 'z']);
  });

  it('normalizes blank and mixed-case topic values and assigns unclassified notes to Other', () => {
    const index = createBookIndex([
      { id: 'one', data: { title: 'One', topics: [' Kubernetes ', '', 'AIOPS'] } },
      { id: 'two', data: { title: 'Two' } },
    ], catalog);
    expect(index.entries.find((entry) => entry.id === 'one')?.topics.map((topic) => topic.slug)).toEqual(['aiops', 'kubernetes']);
    expect(index.entries.find((entry) => entry.id === 'two')?.topics.map((topic) => topic.slug)).toEqual(['other']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/lib/bookIndex.test.ts`

Expected: FAIL because `src/lib/bookIndex.ts` does not exist.

- [ ] **Step 3: Add the declarative catalog and minimal pure implementation**

Create `data/book-topics.yaml` with this initial catalog:

```yaml
- slug: kubernetes
  title: Kubernetes
  description: Cluster architecture, workloads, and incident response.
  featured: 1
- slug: aiops
  title: AIOps
  description: Evidence-led automation and AI-assisted operations.
  featured: 2
- slug: opentelemetry
  title: Telemetry
  description: OpenTelemetry concepts and collector pipelines.
  featured: 3
- slug: sre
  title: SRE
  description: Reliability targets and error budgets.
- slug: jvm-services
  title: JVM Services
  description: JVM framework and service engineering notes.
- slug: senior-engineering-interviews
  title: Senior Engineering Interviews
  description: Technical and behavioral interview preparation.
startHere: [03-kubernetes-architecture, 10-opentelemetry-overview, 15-aiops-overview, 13-sre-sli-slo-error-budgets]
```

Implement `normalizeTopic(value: string)` with `trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`. Implement `createBookIndex` so explicit normalized `topics` win over normalized `domain`, `other` is synthesized only when no membership exists, and hub/entry arrays sort by title using `localeCompare`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/lib/bookIndex.test.ts`

Expected: PASS with three tests.

- [ ] **Step 5: Commit the catalog and pure index**

```bash
git add data/book-topics.yaml src/lib/bookTopics.ts src/lib/bookIndex.ts tests/lib/bookIndex.test.ts
git commit -m "feat: add knowledge book topic index"
```

### Task 2: Integrate the Content Collection and View Models

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/lib/content.ts`
- Modify: `content/book/15-aiops-kubernetes-troubleshooting.md`
- Test: `tests/lib/bookIndex.test.ts`

**Interfaces:**
- Consumes `createBookIndex(entries, topicCatalog)` and `startHere` from Task 1.
- Produces `getKnowledgeDashboardModel()`, `getBookIndexModel()`, and `getBookTopicModel(slug)` for Astro pages.

- [ ] **Step 1: Extend the failing test with start-here validation**

```ts
it('exposes only catalogued Start Here ids that resolve to known entries', () => {
  const index = createBookIndex([{ id: 'known', data: { title: 'Known', domain: 'kubernetes' } }], catalog, ['missing', 'known']);
  expect(index.startHere.map((entry) => entry.id)).toEqual(['known']);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/lib/bookIndex.test.ts`

Expected: FAIL because `createBookIndex` does not yet accept the Start Here ids.

- [ ] **Step 3: Make the collection and content-model changes**

Add these optional fields to the `common` schema used by the book collection:

```ts
topics: z.array(z.string()).default([]),
published: z.coerce.date().optional(),
```

Update `createBookIndex(entries, catalog, startHereIds)` to resolve Start Here entries in catalog order, ignoring missing ids. In `content.ts`, load `book` once per public model method, read `topicCatalog` and `startHere` from `bookTopics.ts`, and expose:

```ts
export async function getKnowledgeDashboardModel() {
  const index = await getBookIndexModel();
  return { startHere: index.startHere, featuredHubs: index.hubs.filter((hub) => hub.featured).sort((a, b) => a.featured! - b.featured!), recentlyAdded: index.entries.slice().sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5) };
}
```

Add `topics: [aiops, kubernetes]` to the AIOps Kubernetes troubleshooting note frontmatter. Do not modify its id, title, body, or canonical route.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/lib/bookIndex.test.ts`

Expected: PASS with the new Start Here assertion.

- [ ] **Step 5: Commit collection and model integration**

```bash
git add src/content.config.ts src/lib/content.ts content/book/15-aiops-kubernetes-troubleshooting.md tests/lib/bookIndex.test.ts
git commit -m "feat: derive knowledge book dashboard data"
```

### Task 3: Build Reusable Knowledge Book Components and Styles

**Files:**
- Create: `src/components/book/TopicHubCard.astro`
- Create: `src/components/book/BookNoteCard.astro`
- Create: `src/components/book/TopicPills.astro`
- Modify: `src/styles/global.css`
- Test: `tests/book/routes-contract.test.ts`

**Interfaces:**
- Consumes `TopicHub` and `BookIndexEntry` emitted by Task 2.
- Produces semantic cards and pills that take absolute logical routes and call `withBase()` internally.

- [ ] **Step 1: Write failing component/source contracts**

```ts
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = (path: string) => readFile(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8');

describe('knowledge book components', () => {
  it('uses withBase for topic and note links', async () => {
    expect(await source('src/components/book/TopicHubCard.astro')).toContain("withBase(`/book/topics/${hub.slug}`)");
    expect(await source('src/components/book/BookNoteCard.astro')).toContain("withBase(`/book/${entry.id}`)");
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `npm test -- tests/book/routes-contract.test.ts`

Expected: FAIL because the book components do not exist.

- [ ] **Step 3: Create components and responsive styles**

Implement `TopicHubCard` as an `<a class="topic-hub-card">` that renders `hub.title`, `hub.description`, and a pluralized note count. Implement `BookNoteCard` as an `<article class="book-note-card">` with a canonical title link and `<TopicPills topics={entry.topics} />`. Implement `TopicPills` as a `<ul class="topic-pills">` of hub links.

Add `.topic-grid { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }`, `.topic-hub-card`, `.book-note-card`, and `.topic-pills` styles. Apply the existing `--accent`, `--line`, and focus-visible treatment; at `max-width:480px`, retain one-column cards and wrapping pills.

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `npm test -- tests/book/routes-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit reusable UI**

```bash
git add src/components/book src/styles/global.css tests/book/routes-contract.test.ts
git commit -m "feat: add knowledge book topic components"
```

### Task 4: Replace Dashboard and Knowledge Book Navigation

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/book/index.astro`
- Create: `src/pages/book/topics/[topic].astro`
- Modify: `src/pages/book/[...slug].astro`
- Test: `tests/book/routes-contract.test.ts`

**Interfaces:**
- Consumes `getKnowledgeDashboardModel`, `getBookIndexModel`, `getBookTopicModel`, and Task 3 components.
- Produces the dashboard, all-notes page, static topic routes, and context-rich note navigation.

- [ ] **Step 1: Add failing route contracts**

```ts
it('renders the knowledge-first dashboard and static topic hubs', async () => {
  expect(await source('src/pages/index.astro')).toContain('Start Here');
  expect(await source('src/pages/index.astro')).toContain('Explore by topic');
  expect(await source('src/pages/index.astro')).toContain('Recently added');
  expect(await source('src/pages/index.astro')).not.toContain('Learning debt');
  expect(await source('src/pages/book/topics/[topic].astro')).toContain('getStaticPaths');
  expect(await source('src/pages/book/[...slug].astro')).toContain('TopicPills');
});
```

- [ ] **Step 2: Run the route contract test to verify it fails**

Run: `npm test -- tests/book/routes-contract.test.ts`

Expected: FAIL because the new dashboard sections and topic route do not exist.

- [ ] **Step 3: Implement the pages**

Replace `index.astro` imports of `ProgressBar`, dashboard metrics, recommendations, debt, projects, and radar with `getKnowledgeDashboardModel`, `TopicHubCard`, and `BookNoteCard`. Render the three named sections in the contract test, with the topic section as `<div class="grid topic-grid">`.

Update `/book` to call `getBookIndexModel()`, render `TopicHubCard` for all hubs, then an `All notes` section rendering `BookNoteCard`.

Create the topic route with this static-path shape:

```ts
export async function getStaticPaths() {
  const index = await getBookIndexModel();
  return index.hubs.map((hub) => ({ params: { topic: hub.slug }, props: { hub } }));
}
```

Render a `withBase('/book')` breadcrumb, title, description, count, and `BookNoteCard` grid. Update the canonical note page to find its indexed entry by `entry.id` and pass its topics to `TopicPills` in the sidebar, retaining the existing All topics link.

- [ ] **Step 4: Run route contracts and the production build**

Run: `npm test -- tests/book/routes-contract.test.ts && npm run build`

Expected: PASS; Astro emits `/book/topics/kubernetes/`, `/book/topics/aiops/`, and canonical `/book/<id>/` pages without route collisions.

- [ ] **Step 5: Commit route implementation**

```bash
git add src/pages/index.astro src/pages/book/index.astro 'src/pages/book/[...slug].astro' 'src/pages/book/topics/[topic].astro' tests/book/routes-contract.test.ts
git commit -m "feat: organize knowledge book by topic hubs"
```

### Task 5: Full Verification and Documentation Check

**Files:**
- Modify only if verification identifies a direct defect in the files from Tasks 1–4.

**Interfaces:**
- Consumes the full static site and test suite.
- Produces a verified, clean worktree with the existing note URLs preserved.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: PASS with existing suites plus the book-index and route-contract suites.

- [ ] **Step 2: Run the full static build**

Run: `npm run build`

Expected: PASS; the route manifest includes existing `/book/03-kubernetes-architecture/`, `/book/15-aiops-kubernetes-troubleshooting/`, and new `/book/topics/kubernetes/` and `/book/topics/aiops/` pages.

- [ ] **Step 3: Inspect the generated HTML for the required navigation copy**

Run: `rg -n "Start Here|Explore by topic|Recently added|Kubernetes|AIOps" dist/index.html dist/book/index.html dist/book/topics/kubernetes/index.html`

Expected: Each required label appears in the relevant output; no dashboard progress percentage or “Learning debt” text appears in `dist/index.html`.

- [ ] **Step 4: Commit a direct verification fix only when Steps 1–3 required one**

Run `git status --short`. If a direct defect was fixed, stage exactly those concrete files and commit with `fix: verify knowledge book topic navigation`. If Steps 1–3 required no source change, leave the worktree unchanged and do not create a commit.
