# AI Infrastructure Learning OS

A personal, GitHub-backed learning system for infrastructure engineering, observability, SRE, platform engineering, AIOps, MCP, and agentic operations.

## Architecture

This is a static Astro site. Markdown/MDX in `content/` is the knowledge source of truth; YAML/JSON in `data/` holds cross-cutting activity, domains, quizzes, and Engineering Radar news/release data. Pure TypeScript modules in `src/lib/` calculate progress, learning debt, recommendations, activity, and the Engineering Radar without an API or database.

## Local development

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm test
npm run build
```

## Repository layout

- `content/book/`: knowledge-book Markdown pages
- `content/labs/`: practical lab guides
- `content/projects/`: project objectives and milestones
- `content/inbox/`: raw learning captures
- `data/`: domain, activity, quiz, and news data
- `src/lib/`: typed business logic
- `src/pages/`: statically generated routes
- `tests/`: Vitest unit tests

## Adding learning content

Create a Markdown file in `content/book/` with frontmatter such as:

```yaml
title: PromQL Histograms
domain: prometheus
topic: histograms
status: learning
coverage: 40
confidence: 3
importance: high
```

Use the supported statuses `not_started`, `learning`, `practicing`, `review`, and `mastered`. Coverage is 0–100 and confidence is 0–5. Add labs and quiz counts when evidence exists; missing metrics are excluded and available progress weights are normalized.

Labs belong in `content/labs/` and should include objective, setup, task, commands, expected observation, investigation, solution, and lessons learned. Projects belong in `content/projects/` with objective, architecture, milestones, outcomes, progress, and open tasks.

## Engineering Radar

The Radar (`/news`) is a static, deterministically-classified feed of official infrastructure and AIOps developments, connected to your learning state. It has no backend: a Node script collects and validates data at commit time (locally or in CI); the site only ever reads the resulting JSON.

**Source schema** — `data/news-sources.yaml` is a list of:

```yaml
- id: kubernetes          # stable identifier, used in generated item ids
  name: Kubernetes        # display name
  category: kubernetes    # kubernetes | observability | platform-engineering | aiops | infrastructure
  websiteUrl: https://kubernetes.io
  feedUrl: https://kubernetes.io/feed.xml  # official RSS/Atom feed; omit + enabled:false if none exists yet
  priority: 1              # 1 (highest) – 3, feeds into importance scoring
  enabled: true
  tags: [kubernetes]
```

**Adding a source**: only add official/primary feeds (a project's own blog or its GitHub `releases.atom`, which every public repo exposes and which works well for terse release-only projects) — never a third-party aggregator or scraped HTML page. Verify the feed URL actually returns valid RSS/Atom before committing it. Set `enabled: false` for a source you want tracked but don't yet have a reliable feed for.

**Deterministic heuristics** (`src/lib/news/classifier.ts`, `importance.ts`): domain/topic classification and architecture-shift detection run off ordered keyword rules against the title and summary, falling back to a per-source default domain for terse release titles (e.g. bare version tags) that carry no keyword. Importance is a point-scored band (`low`/`medium`/`high`/`critical`) from source priority, release/GA wording, architecture-shift signals, and security/breaking/deprecation terms. None of this calls an LLM or external API — see the rule tables in those files to extend them.

**Manual refresh**:

```bash
npm run news:collect
```

Fetches every enabled source independently, normalizes and sanitizes entries (HTML stripped, tracking query params removed, canonical URL used as the dedup key), merges with `data/news.json`, and writes `data/news.json` / `data/releases.json` only if the content actually changed.

**Retention**: at most 500 items from the last 90 days are kept; when over the cap, higher-importance and more-recent items are kept preferentially. `data/releases.json` holds one latest release per project.

**Feed-failure troubleshooting**: a failed source is logged (`[news:collect] source "<id>" failed: <message>`) and skipped — it never blocks other sources or erases previously-collected data. If every source fails in one run, no files are written and the run still exits successfully. Common causes: the feed URL changed (re-verify and update `data/news-sources.yaml`), the request exceeded the 15-second timeout, or the feed returned malformed XML (that source's items are simply skipped for the run).

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests and the production build, then deploys `dist` with GitHub Pages. In repository Settings → Pages, set Source to **GitHub Actions**. Astro derives the `/learning` base path from `GITHUB_REPOSITORY` during Actions builds.

`.github/workflows/refresh-radar.yml` runs `npm run news:collect` daily (plus manual `workflow_dispatch`) and commits `data/news.json`/`data/releases.json` only when they changed.

Interactive quizzes, search, databases, authentication, backends, and general AI features are intentionally deferred beyond V1.
