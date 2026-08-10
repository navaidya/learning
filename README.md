# AI Infrastructure Learning OS

A personal, GitHub-backed learning system for infrastructure engineering, observability, SRE, platform engineering, AIOps, MCP, and agentic operations.

## Architecture

This is a static Astro site. Markdown/MDX in `content/` is the knowledge source of truth; YAML/JSON in `data/` holds cross-cutting activity, domains, quizzes, and future news data. Pure TypeScript modules in `src/lib/` calculate progress, learning debt, recommendations, and activity without an API or database.

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

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs tests and the production build, then deploys `dist` with GitHub Pages. In repository Settings → Pages, set Source to **GitHub Actions**. Astro derives the `/learning` base path from `GITHUB_REPOSITORY` during Actions builds.

Interactive quizzes, search, scheduled news ingestion, databases, authentication, backends, and AI features are intentionally deferred beyond V1.
