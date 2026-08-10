# AI Infrastructure Learning OS V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static Astro application that makes a personal, Markdown-first AI infrastructure learning system usable on GitHub Pages.

**Architecture:** Git-tracked Markdown/MDX and YAML/JSON are authoritative learning data. Astro content collections validate and load them at build time; pure TypeScript modules turn that data into progress, learning-debt, recommendation, and activity view models. Small accessible Astro components render those models; there is no runtime backend.

**Tech Stack:** Astro, TypeScript strict mode, Astro content collections, Markdown/MDX, Zod, YAML, Vitest, GitHub Actions, GitHub Pages.

## Global Constraints

- Static generation only: no database, authentication, API server, cloud service, container runtime, or Kubernetes deployment.
- Markdown/MDX under `content/` is the source of truth for book pages, labs, projects, and inbox items.
- Use exactly: `not_started`, `learning`, `practicing`, `review`, `mastered`.
- Progress weights are coverage 30%, quiz 20%, labs 25%, confidence 15%, recency 10%; normalize weights proportionally for unavailable metrics.
- Use deterministic business logic outside components; no LLM.
- Test calculation and content-validation boundaries. Both `npm test` and `npm run build` must pass.
- Preserve existing vault material; do not create dozens of empty placeholders.

---

## Target Structure

| Path | Responsibility |
| --- | --- |
| `src/content/config.ts` | Zod schemas and content collections |
| `src/lib/{types,progress,learningDebt,recommendations,activity,content}.ts` | Shared types, pure logic, and build-time view-model adapters |
| `src/components/{common,dashboard,book}/` | Focused presentational components |
| `src/layouts/`, `src/pages/` | Accessible layouts and static routes |
| `content/`, `data/` | Markdown content and structured source data |
| `tests/lib/` | Vitest unit tests |
| `.github/workflows/deploy.yml` | Pages deployment |
| `README.md` | Authoring, development, and deployment instructions |

### Task 1: Scaffold Astro with strict testing

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/env.d.ts`, `src/styles/global.css`
- Modify: `.gitignore`, `README.md`
- Test: `tests/lib/progress.test.ts`

**Produces:** `npm test` and `npm run build` commands.

- [ ] Create the Astro TypeScript strict app. Install only Astro, `@astrojs/mdx`, `@astrojs/sitemap`, Zod, and Vitest.
- [ ] Set scripts to `test: vitest run` and `build: astro check && astro build`.
- [ ] Write and run the harness test:

```ts
import { expect, it } from 'vitest';
it('runs tests', () => expect(true).toBe(true));
```

Run: `npm test`  
Expected: PASS.

- [ ] Configure Astro’s `base` from `GITHUB_REPOSITORY`, using `/` locally and `/learning` in GitHub Actions.
- [ ] Add accessible global focus styles, light/dark color variables, system typography, and responsive spacing.
- [ ] Run: `npm run build`  
Expected: PASS.
- [ ] Commit: `chore: scaffold astro learning platform`.

### Task 2: Define validated content and seed samples

**Files:**
- Create: `src/content/config.ts`, `src/lib/types.ts`, `data/{domains,activity}.yaml`, `data/quizzes/kubernetes.yaml`, `data/news.json`
- Create: eight book samples across Kubernetes, OpenTelemetry, SRE, and AIOps; two labs; three projects; one inbox item
- Test: `tests/lib/contentValidation.test.ts`

**Produces:** `TopicMetadata`, `LabMetadata`, `ProjectMetadata`, `ActivityEntry`, `DomainDefinition`; collections `book`, `labs`, `projects`, `inbox`.

- [ ] Write failing schema tests for allowed status, confidence 0–5, coverage 0–100, ISO dates, and non-negative quiz/lab counts.

```ts
expect(topicSchema.safeParse({ title: 'Collector', status: 'learning', confidence: 5 }).success).toBe(true);
expect(topicSchema.safeParse({ title: 'Bad', status: 'done' }).success).toBe(false);
```

- [ ] Implement schemas with optional frontmatter defaults; only `title` is required on book pages.
- [ ] Add the 18 specified domains and meaningful samples: Kubernetes architecture/troubleshooting; OpenTelemetry overview/collector; SRE SLI/SLO/error budgets; AIOps overview/Kubernetes troubleshooting.
- [ ] Add the required lab sections: objective, setup, task, commands, expected observation, investigation, solution, and lessons learned.
- [ ] Run: `npm test -- tests/lib/contentValidation.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add learning content schema`.

### Task 3: Implement progress calculation

**Files:**
- Create: `src/lib/progress.ts`
- Test: `tests/lib/progress.test.ts`

**Produces:** `calculateTopicProgress(topic: TopicMetadata, asOf: Date): ProgressResult` and `calculateDomainProgress(topics: TopicProgress[]): number`.

- [ ] Write failing tests for all dimensions, absent quiz/labs/confidence, no metrics, maximums, and zeroes.
- [ ] Implement extraction and clamping. Quiz/lab metrics are unavailable when the denominator is zero or absent. Recency is 100 on review date and declines linearly to 0 after 60 days; absent without a review date.
- [ ] Normalize only available metric weights and round the final score to a whole number.

```ts
expect(calculateTopicProgress({ coverage: 50 }, new Date('2026-08-10')).score).toBe(50);
```

- [ ] Run: `npm test -- tests/lib/progress.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: implement progress calculation`.

### Task 4: Implement learning debt and recommendations

**Files:**
- Create: `src/lib/learningDebt.ts`, `src/lib/recommendations.ts`
- Test: `tests/lib/learningDebt.test.ts`, `tests/lib/recommendations.test.ts`

**Produces:** `calculateLearningDebt(topic, progress, asOf): LearningDebt` and `recommendTopics(topics, asOf, limit): RecommendedTopic[]`.

- [ ] Write failing tests for mastered/recent, stale, weak quiz, missing labs, critical importance, combined risks, critical weak topic first, mastered topic low, and stale/incomplete-lab priority.
- [ ] Implement deterministic debt points for progress below 60, review older than 30 days, confidence under 3, quiz under 70%, incomplete required labs, and high/critical importance.
- [ ] Map scores to `none: 0`, `low: 1–24`, `medium: 25–49`, `high: 50–74`, `critical: 75+`; a mastered topic reviewed in the last 30 days cannot exceed low.
- [ ] Rank recommendations by importance, debt, prerequisite presence, missing labs, stale review, quiz score, and confidence. Return one concrete reason per result.
- [ ] Run: `npm test -- tests/lib/learningDebt.test.ts tests/lib/recommendations.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add learning debt and recommendations`.

### Task 5: Implement activity and build-time adapters

**Files:**
- Create: `src/lib/activity.ts`, `src/lib/content.ts`
- Test: `tests/lib/{activity,content}.test.ts`

**Produces:** `calculateStreak(entries, asOf): number`, `getRecentActivity(entries, limit): ActivityEntry[]`, `getDashboardModel(asOf): DashboardModel`, and `getDomainModel(slug, asOf): DomainModel | undefined`.

- [ ] Write failing tests for same-day activity, consecutive-day streak, gap reset, sorted activity, and an empty domain.
- [ ] Implement calendar-day activity normalization, not 24-hour elapsed-time arithmetic.
- [ ] Implement adapters that combine collections, domains, progress, debt, recommendations, activity, projects, inbox, and news into UI models. Empty domains return zero counts/progress and never throw.
- [ ] Run: `npm test -- tests/lib/activity.test.ts tests/lib/content.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add activity and learning view models`.

### Task 6: Build the accessible site shell

**Files:**
- Create: `src/layouts/{BaseLayout,BookLayout}.astro`, `src/components/common/{Header,Sidebar,ThemeToggle,ProgressBar,StatusBadge}.astro`
- Modify: `src/styles/global.css`, `src/lib/types.ts`

**Produces:** shared navigation, mobile layout, friendly labels, and accessible progress display.

- [ ] Build a semantic shell with skip link, labelled navigation, main landmark, and keyboard-operable mobile menu.
- [ ] Implement `statusLabel(status: LearningStatus): string` for all five UI labels.
- [ ] Render `ProgressBar` with `role="progressbar"`, 0/100 ARIA bounds, and textual percentage.
- [ ] Manually verify tab order, visible focus, heading order, contrast, and 320px responsiveness.
- [ ] Run: `npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add accessible responsive site shell`.

### Task 7: Build dashboard, skill map, and domain routes

**Files:**
- Create: `src/pages/{index,skills/index,skills/[slug]}.astro`
- Create: `src/components/dashboard/{MetricSummary,DomainSummary,LearningDebtCard,RecommendedTopicCard,ActivityList,ActiveWorkList}.astro`
- Test: `tests/lib/content.test.ts`

**Consumes:** `DashboardModel` and `DomainModel`.  
**Produces:** static dashboard, skill-map, and domain-detail routes.

- [ ] Extend adapter tests for overall progress, streak, counts, debt, recommendations, activity, active projects, and empty states.
- [ ] Render dashboard sections from the model; no calculation logic belongs in components.
- [ ] Render 18 linked domain summaries with progress, status, topic count, lab completion, review count, and last activity.
- [ ] Implement `getStaticPaths` domain pages showing dimensions, topics, and recommended next steps.
- [ ] Run: `npm test -- tests/lib/content.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add dashboard and skill map`.

### Task 8: Build the knowledge book

**Files:**
- Create: `src/pages/book/{index,[...slug]}.astro`, `src/components/book/{BookNavigation,TableOfContents,PreviousNext}.astro`
- Modify: `src/layouts/BookLayout.astro`, `src/lib/content.ts`
- Test: `tests/lib/content.test.ts`

**Produces:** numeric-section order, sidebar navigation, rendered Markdown/MDX, table of contents, and previous/next links.

- [ ] Test natural sort order for `03-kubernetes` and `10-opentelemetry`, nested paths, and adjacent-page boundaries.
- [ ] Implement a book tree and adjacent-entry lookup in `src/lib/content.ts`.
- [ ] Render article title/frontmatter, content headings, syntax highlighting, internal links, sidebar, TOC, and previous/next navigation.
- [ ] Omit unpopulated sections rather than adding placeholders.
- [ ] Run: `npm test -- tests/lib/content.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add book navigation`.

### Task 9: Build labs, projects, inbox, and static news routes

**Files:**
- Create: `src/pages/labs/{index,[...slug]}.astro`, `src/pages/projects/{index,[...slug]}.astro`, `src/pages/inbox/index.astro`, `src/pages/news/index.astro`
- Create: `src/components/common/{ContentList,MetadataList,EmptyState}.astro`
- Test: `tests/lib/content.test.ts`

- [ ] Test filters, project progress/status, inbox count, and an empty-news dataset.
- [ ] Render collection index/detail routes for labs and projects, including every required Markdown section and project metadata.
- [ ] Render inbox ordered by date and news directly from `data/news.json`; add an explicit empty state.
- [ ] Do not add browser fetching or news collection in V1.
- [ ] Run: `npm test -- tests/lib/content.test.ts && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: add learning collections pages`.

### Task 10: Deploy and document

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`, `AGENTS.md`

**Produces:** a Pages workflow that runs `npm ci`, `npm test`, and `npm run build` before deploying `dist`.

- [ ] Configure GitHub Pages with `configure-pages`, Node setup, artifact upload, and deployment actions.
- [ ] Document setup, structure, adding topics/labs, changing progress frontmatter, adding quiz YAML, and deployment.
- [ ] Document: GitHub Settings → Pages → Source = GitHub Actions.
- [ ] Run: `npm test && npm run build`  
Expected: PASS.
- [ ] Commit: `feat: deploy learning platform to github pages`.

### Task 11: Release verification

**Files:**
- Modify only verified defects found during this pass.

- [ ] Run: `npm test && npm run build`  
Expected: both commands exit 0; no suppressed TypeScript errors.
- [ ] Manually check desktop and 320px views, all navigation paths, dark/light contrast, focus indicators, dashboard data, book adjacent links, and collection empty states.
- [ ] Confirm absence of authentication, database, API server, automatic news, search, quiz gameplay, AI classification, chatbot, and LLM integration.
- [ ] Commit a focused fix only if verification finds a defect.

## Plan Self-Review

- **Coverage:** Tasks 1–2 establish the stack, data model, samples, and validation; 3–5 cover progress, debt, recommendations, activity, and safe defaults; 6–9 build all V1 pages; 10 deploys and documents; 11 verifies quality and scope.
- **Deliberate exclusions:** Search, interactive quizzes, news ingestion, spaced repetition, and AI workflows remain V2/V3 only.
- **Consistency:** Every produced module/function is named in the task that creates it; later UI tasks consume those typed adapters instead of reimplementing rules.

