# Engineering Radar V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a static, GitHub Actions-refreshed Engineering Radar that highlights trusted infrastructure developments and connects them deterministically to existing learning state.

**Architecture:** A small Node collector runs in GitHub Actions or manually, retrieves configured official RSS/Atom feeds, strips untrusted markup, normalizes records, and merges valid results into data/news.json without deleting the prior dataset on total failure. Pure TypeScript modules classify, score, deduplicate, retain, and personalize records; Astro pages and existing dashboard styles render the static view model.

**Tech Stack:** Existing Astro 6, TypeScript strict mode, Vitest, GitHub Actions, Node 22; add only fast-xml-parser and yaml.

## Global Constraints

- Do not redesign the Learning OS, add browser-side fetching, a backend, database, authentication, or an LLM/API integration.
- Sources are data-driven official/primary feeds in data/news-sources.yaml. Do not use brittle HTML scraping.
- Remote feed content is untrusted: normalize it to plain text, never render its HTML, and skip malformed entries.
- Use deterministic classification, importance, architecture-shift, release, and relevance rules.
- Keep at most 500 valid records from the last 90 days; preserve prior data if every source fails.
- One failed source must not prevent other sources from being processed.
- Reuse src/lib/content.ts, dashboard components, styling tokens, and GitHub Pages deployment.
- Add tests for all domain logic; completion requires npm test and npm run build.

---

## Target Structure

| Path | Responsibility |
| --- | --- |
| data/news-sources.yaml | Official feed configuration. |
| data/news.json and data/releases.json | Validated static Radar data. |
| src/lib/news/types.ts | NewsSource, NewsItem, ReleaseWatchItem contracts. |
| src/lib/news/{validate,classifier,importance,relevance,retention,feeds,radar}.ts | Pure Radar domain logic. |
| scripts/news/collect.mjs | Fetch, normalize, merge, retain, and atomically write data. |
| tests/news and tests/fixtures/news | Fixture-driven unit tests with no live internet. |
| src/components/news and src/pages/news | Static Radar UI and dynamic category route. |
| .github/workflows/refresh-radar.yml | Daily, no-noise data refresh. |

### Task 1: Add Radar data contracts and source configuration

**Files:**
- Create: src/lib/news/types.ts, src/lib/news/validate.ts, data/news-sources.yaml, data/releases.json
- Modify: data/news.json, package.json
- Test: tests/news/validate.test.ts

**Interfaces:**
- Produces NewsImportance, NewsSource, NewsItem, ReleaseWatchItem.
- Produces parseNewsSource(value: unknown): NewsSource and parseNewsItem(value: unknown): NewsItem.

- [ ] **Step 1: Write the failing contract tests.**

~~~ts
expect(() => parseNewsSource({
  id: 'kubernetes', name: 'Kubernetes', category: 'kubernetes',
  websiteUrl: 'https://kubernetes.io', priority: 1, enabled: true, tags: ['kubernetes']
})).not.toThrow();
expect(() => parseNewsItem({ title: 'missing required fields' })).toThrow();
~~~

- [ ] **Step 2: Run npm test -- tests/news/validate.test.ts.**
Expected: FAIL because the validation module is absent.

- [ ] **Step 3: Implement Zod contracts.**
NewsItem requires id, title, source, sourceId, HTTP(S) URL, ISO publishedDate, domain, topics, importance, architectureShift, and releaseRelated. Summary, release project/version, relevance, and related learning topics are optional.

- [ ] **Step 4: Configure Tier 1 records.**
Use verified official feeds for CNCF, Kubernetes, OpenTelemetry, Prometheus, Grafana Labs, Cilium, Terraform, OpenTofu, Argo, Backstage, OCI/OKE, HolmesGPT/Robusta, K8sGPT, and OpenAI developer updates. Disabled records are allowed for sources without a reliable feed.

- [ ] **Step 5: Seed two validated static records and an empty release array.**

- [ ] **Step 6: Run npm test -- tests/news/validate.test.ts && npm run build.**
Expected: PASS.

- [ ] **Step 7: Commit.**

~~~bash
git add src/lib/news data/news-sources.yaml data/news.json data/releases.json tests/news/validate.test.ts
git commit -m "feat: add engineering radar data contracts"
~~~

### Task 2: Implement classification, importance, and architecture-shift rules

**Files:**
- Create: src/lib/news/classifier.ts, src/lib/news/importance.ts
- Test: tests/news/classifier.test.ts, tests/news/importance.test.ts

**Interfaces:**
- Produces classifyNews(input): domain, topics, architectureShift, releaseRelated, releaseProject, releaseVersion.
- Produces scoreImportance(input): NewsImportance.
- Input shape: sourceId, sourceTags, title, summary.

- [ ] **Step 1: Write failing keyword classification tests.**

~~~ts
expect(classifyNews({ sourceId: 'otel', sourceTags: [], title: 'OpenTelemetry Collector 1.2 released' }).domain).toBe('opentelemetry');
expect(classifyNews({ sourceId: 'cilium', sourceTags: [], title: 'Cilium adds eBPF networking' }).topics).toContain('ebpf');
expect(classifyNews({ sourceId: 'blog', sourceTags: [], title: 'Team lunch photos' }).architectureShift).toBe(false);
~~~

- [ ] **Step 2: Run npm test -- tests/news/classifier.test.ts.**
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement ordered rule tables outside UI code.**
Map OpenTelemetry/OTel/OTLP; Prometheus/PromQL; Cilium/eBPF/Hubble; Terraform/OpenTofu; Argo CD/GitOps; Backstage/developer portal/IDP/golden path; HolmesGPT/K8sGPT/AI SRE; MCP/agentic operations/AI agent. Fall back safely to the source category.

- [ ] **Step 4: Implement architecture shift detection.**
Require an architecture signal (Gateway API, DRA, OpenTelemetry pipeline, platform API, MCP, agent-assisted investigation, replacement, deprecation, new API, graduation, or AI/GPU scheduling) plus a matching project/domain signal.

- [ ] **Step 5: Add a failing importance test, then implement documented point bands.**

~~~ts
expect(scoreImportance({ sourcePriority: 1, title: 'Kubernetes v1.35 generally available', architectureShift: false, releaseRelated: true })).toBe('high');
expect(scoreImportance({ sourcePriority: 2, title: 'Community office hours', architectureShift: false, releaseRelated: false })).toBe('low');
~~~

Score source priority, release wording/version, architecture shift, security/breaking/deprecation terms, and high-priority domains.

- [ ] **Step 6: Run focused tests and npm run build.**
- [ ] **Step 7: Commit with feat: classify engineering radar news.**

### Task 3: Normalize feeds, deduplicate, retain, and derive releases

**Files:**
- Create: src/lib/news/feeds.ts, src/lib/news/retention.ts
- Test: tests/news/feeds.test.ts, tests/news/retention.test.ts, tests/fixtures/news/rss.xml, tests/fixtures/news/atom.xml

**Interfaces:**
- Produces normalizeFeedItem(raw, source): NormalizedCandidate | undefined.
- Produces mergeNews(existing, incoming, asOf): NewsItem[].
- Produces deriveReleaseWatch(items): ReleaseWatchItem[].

- [ ] **Step 1: Add RSS/Atom fixtures with valid items, HTML summary, missing URL, and a shared canonical URL.**
- [ ] **Step 2: Write failing normalization and retention tests.**

~~~ts
expect(normalizeFeedItem({
  title: 'OTel <b>release</b>', url: 'https://example.test/release?utm_source=rss',
  publishedDate: '2026-08-10', summary: '<p>Safe <em>text</em></p>'
}, source)?.summary).toBe('Safe text');
expect(mergeNews([], [first, duplicate], new Date('2026-08-10'))).toHaveLength(1);
~~~

- [ ] **Step 3: Implement canonical URLs and stable IDs.**
Remove fragments and tracking query keys (utm_*, ref, source), lowercase hostnames, and use sourceId plus canonical URL as the ID basis.

- [ ] **Step 4: Strip remote tags/script/style content, decode entities, collapse whitespace, and cap summary at 500 characters.**
- [ ] **Step 5: Keep newest record per ID, reject future dates, remove entries older than 90 days, and retain the highest-ranked 500.**
- [ ] **Step 6: Derive one latest release record per known project.**
- [ ] **Step 7: Run focused tests and build; commit feat: normalize and retain radar news.**

### Task 4: Add For You relevance and Radar view model

**Files:**
- Create: src/lib/news/relevance.ts, src/lib/news/radar.ts
- Modify: src/lib/content.ts, src/lib/types.ts
- Test: tests/news/relevance.test.ts, tests/news/radar.test.ts

**Interfaces:**
- Produces scoreLearningRelevance(item, topics): number from 0–100.
- Produces getEngineeringRadarModel(category, asOf): Promise<EngineeringRadarModel>.
- Adds engineeringRadar: RadarSummary to getDashboardModel().
- Categories: for-you, kubernetes, observability, platform-engineering, aiops, infrastructure.

- [ ] **Step 1: Write failing relevance tests.**

~~~ts
expect(scoreLearningRelevance(highOtelItem, weakOtelTopics))
  .toBeGreaterThan(scoreLearningRelevance(highOtelItem, masteredUnrelatedTopics));
expect(scoreLearningRelevance(itemWithDebt, weakOtelTopics))
  .toBeGreaterThan(scoreLearningRelevance(itemWithoutDebt, weakOtelTopics));
~~~

- [ ] **Step 2: Combine importance, matching-domain low progress, matching-domain debt, related topic importance, and active learning status. Clamp to 0–100.**
- [ ] **Step 3: Implement deterministic category mapping and sorting.**
For You sorts by relevance. Observability includes OpenTelemetry, Prometheus, Grafana, logging, tracing, eBPF, and Cilium. Infrastructure includes Terraform, OpenTofu, GitOps, Helm, Kubernetes, and OKE.
- [ ] **Step 4: Return a five-item dashboard summary and safe empty state.**
- [ ] **Step 5: Run focused tests/build; commit feat: personalize engineering radar.**

### Task 5: Implement the isolated Node collector

**Files:**
- Create: scripts/news/collect.mjs, scripts/news/load-sources.mjs, scripts/news/write-data.mjs
- Modify: package.json, package-lock.json
- Test: tests/news/collector.test.ts

**Interfaces:**
- Adds npm run news:collect.
- Produces collectRadar({ sources, existingItems, fetchImpl, asOf }): Promise<CollectionResult>.
- CollectionResult contains items, releases, fetchedSourceIds, failures.

- [ ] **Step 1: Write a failing injected-fetch test.**

~~~ts
const result = await collectRadar({ sources: [healthySource, failedSource], existingItems: [existing], fetchImpl, asOf });
expect(result.fetchedSourceIds).toEqual(['healthy']);
expect(result.failures).toHaveLength(1);
expect(result.items).toContainEqual(existing);
~~~

- [ ] **Step 2: Add fast-xml-parser and yaml.**
- [ ] **Step 3: Fetch each source independently with a 15-second abort signal.**
Log source ID and safe error message, parse RSS/Atom, and skip malformed entries.
- [ ] **Step 4: Reuse earlier pure modules.**
If no source succeeds, log retained prior data and exit 0 without writes. If sources succeed, atomically write data/news.json and data/releases.json only if their content changed.
- [ ] **Step 5: Run collector test and npm run news:collect.**
Expected: failed feeds do not erase existing data.
- [ ] **Step 6: Commit feat: collect engineering radar feeds.**

### Task 6: Build the Radar UI and dashboard integration

**Files:**
- Create: src/components/news/NewsCard.astro, NewsFilters.astro, ReleaseWatch.astro, RadarSummary.astro, src/pages/news/[category].astro
- Modify: src/pages/news/index.astro, src/pages/index.astro, src/styles/global.css, src/layouts/BaseLayout.astro
- Test: tests/news/radar.test.ts

**Interfaces:**
- Consumes EngineeringRadarModel, NewsItem, ReleaseWatchItem, existing ProgressBar.
- Produces /news and static routes for all six categories.

- [ ] **Step 1: Add view-model tests for empty data, category filtering, release data, architecture-shift priority, and the five-item dashboard cap.**
- [ ] **Step 2: Replace the placeholder with the For You Radar.**
Render category links, source/importance/date, tags, sparse Architecture Shift/New Release/High Priority/Critical badges, external Read source links, and related learning links.
- [ ] **Step 3: Implement [category].astro with getStaticPaths.**
Invalid categories redirect to /news; do not duplicate page logic.
- [ ] **Step 4: Render Release Watch with explicit empty state.**
- [ ] **Step 5: Add a five-item RadarSummary after Active Labs & Projects on the dashboard.**
- [ ] **Step 6: Reuse global CSS tokens.**
Manually verify 320px layout, keyboard navigation, focus states, heading order, external-link labels, and no injected remote HTML.
- [ ] **Step 7: Run npm test -- tests/news/radar.test.ts && npm run build.**
Expected: generated news, kubernetes, observability, platform-engineering, aiops, and infrastructure routes.
- [ ] **Step 8: Commit feat: add engineering radar interface.**

### Task 7: Automate refreshes and document operations

**Files:**
- Create: .github/workflows/refresh-radar.yml
- Modify: README.md, AGENTS.md
- Test: npm test && npm run build

**Interfaces:**
- Workflow runs daily plus workflow_dispatch, runs npm ci and npm run news:collect, and pushes only changed news data with chore: refresh engineering radar.
- Existing deploy workflow remains the site deployment mechanism.

- [ ] **Step 1: Add daily UTC cron and safe changed-files commit.**

~~~yaml
- run: npm ci
- run: npm run news:collect
- run: git diff --quiet -- data/news.json data/releases.json || git commit -am "chore: refresh engineering radar"
- run: git push
~~~

Set bot identity and contents-write permission. A no-change or all-source-failure run must exit successfully.

- [ ] **Step 2: Document source schema, source addition, deterministic heuristics, manual refresh, retention, and feed-failure troubleshooting in README.**
- [ ] **Step 3: Add static/serverless, primary-source, untrusted-content, deterministic-first, no-LLM, and graceful-degradation guardrails to AGENTS.md.**
- [ ] **Step 4: Run npm test && npm run build.**
Expected: all suites pass and static build succeeds.
- [ ] **Step 5: Commit docs: document engineering radar operations.**

## Plan Self-Review

- **Coverage:** Data contracts, official sources, normalization, safe content, classification, importance, shifts, release watch, For You relevance, related learning, UI, dashboard summary, failed feeds, deduplication, retention, automation, documentation, accessibility, and static performance are each assigned to a testable task.
- **Scope boundary:** Browser fetching, generic aggregators, raw remote HTML, backend storage, editing workflows, AI enrichment, LLM calls, RAG, and vector databases remain excluded.
- **Dependency rationale:** fast-xml-parser provides structured RSS/Atom parsing without scraping; yaml lets the Node collector read the shared source configuration. No UI dependency is added.

