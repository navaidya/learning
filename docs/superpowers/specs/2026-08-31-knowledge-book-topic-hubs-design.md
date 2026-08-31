# Knowledge Book Topic Hubs Design

## Goal

Reframe the site from a progress-oriented Learning OS into a knowledge book that lets a reader reach relevant notes quickly. The dashboard becomes a lightweight knowledge entry point, and the Knowledge Book becomes a topic-based directory. Existing Markdown notes and their `/book/<id>` URLs remain authoritative and unchanged.

## Scope

In scope:

- Remove learning percentages, streaks, recommendations, learning debt, and activity/project/inbox metrics from the dashboard.
- Add a dashboard with a short introduction, a small Start Here collection, topic-hub tiles, and a compact Recently Added collection.
- Replace the flat Knowledge Book list with topic-hub tiles and a complete note index.
- Add static `/book/topics/<topic>` pages that group existing book entries by topic.
- Derive topic membership from frontmatter without duplicating Markdown.

Out of scope:

- Changing the content or URLs of existing notes.
- Full-text search, quizzes, progress tracking, a backend, or new third-party dependencies.
- Reorganizing unrelated routes such as Labs, System Design, Coding Interviews, News, or Skill Map.

## Content Model

Add an optional `topics: string[]` field to the `book` collection schema. `topics` is the canonical cross-cutting classification field. `domain` remains for existing content compatibility and is used as a fallback topic when `topics` is absent.

The derived topic model is built in `src/lib/content.ts` from `getCollection('book')`:

- Normalize topic slugs to lowercase kebab case and supply display names through a local title-case formatter or small label map.
- For each note, use the explicit `topics` list when present; otherwise use `[domain]`; otherwise place it in `other`.
- De-duplicate topic values within one note and sort note lists alphabetically by title.
- Sort hubs alphabetically by display name, except a small configured featured-topic order on the dashboard.

Initial explicit memberships use existing subjects and tags:

| Hub | Notes |
| --- | --- |
| Kubernetes | Kubernetes Architecture; Kubernetes Troubleshooting; AI-assisted Kubernetes Troubleshooting |
| AIOps | What AIOps Means; AI-assisted Kubernetes Troubleshooting |
| Telemetry | OpenTelemetry Overview; OpenTelemetry Collector |
| SRE | SLI, SLO, and Error Budgets |
| JVM Services | Micronaut Interview Preparation |
| Senior Engineering Interviews | OCI Values Interview Preparation |

`AI-assisted Kubernetes Troubleshooting` receives both `aiops` and `kubernetes` explicitly. This demonstrates shared membership while retaining one source note.

## Routes and Interface

### Dashboard (`/`)

Replace the current metric-heavy dashboard with:

1. **Knowledge Book** heading and a concise description.
2. **Start Here**: three to five configured foundational notes. Initial entries: Kubernetes Architecture, OpenTelemetry Overview, What AIOps Means, and SLI/SLO/Error Budgets.
3. **Explore by topic**: responsive topic tiles, showing a title, short inferred/curated description, and note count. The first row prioritizes Kubernetes, AIOps, and Telemetry.
4. **Recently added**: up to five notes, ordered by a new optional `published` frontmatter date when available; otherwise deterministic filename/id order. It is informational only, never a progress signal.

Topic and note links use `withBase()` exclusively.

### Knowledge Book index (`/book`)

Lead with the same topic tiles, followed by an **All notes** list. Each note card shows its title and linked topic pills. Topic links navigate to `/book/topics/<slug>`; note links continue to `/book/<id>`.

### Topic hub (`/book/topics/<slug>`)

Use static paths generated from the derived topic model. Each hub contains:

- Breadcrumb/link back to Knowledge Book.
- Hub title, optional short description, and note count.
- A responsive card grid of its member notes.
- Every card links to the canonical note route and displays the other hubs it belongs to.

Unknown hubs return a static 404 through Astro's normal route behavior. No redirects or duplicate note pages are introduced.

### Note page (`/book/<id>`)

Keep the current route and article content. Expand the sidebar from only “All topics” to include links to the note's topic hubs, allowing direct navigation between related knowledge.

## Components and Boundaries

- `src/lib/content.ts`: pure, tested book-index functions and a compact dashboard view model. It does not calculate progress or learning debt for the redesigned dashboard.
- `src/components/book/`: presentational `TopicHubCard`, `BookNoteCard`, and `TopicPills` components that receive precomputed data.
- `src/pages/index.astro`: assembles the knowledge-first dashboard.
- `src/pages/book/index.astro`: renders topic index plus all-note index.
- `src/pages/book/topics/[topic].astro`: renders an individual hub using static paths.
- `src/pages/book/[...slug].astro`: augments note navigation with related topic hubs.
- `src/styles/global.css`: adds responsive card and topic-pill styles while retaining the existing visual language and accessibility behavior.

Existing progress/recommendation modules remain untouched because other pages may still rely on them; the redesigned dashboard simply stops importing them.

## Accessibility and Responsiveness

Topic tiles and note cards are semantic links with clear visible focus and hover states. Topic pills have descriptive text and no color-only meaning. The grid collapses to one column on narrow screens; headings and links remain usable without hover or JavaScript.

## Testing

Add focused tests for the derived book index:

- Explicit `topics` override/fill membership and allow a single note in multiple hubs.
- Existing notes with only `domain` remain included through fallback.
- Duplicate and blank topic values are removed.
- Hub and note ordering is deterministic.
- Dashboard Start Here references resolve to existing notes.
- Static topic routes include all generated hubs and canonical note URLs remain unchanged.

Run `npm test` and `npm run build` after implementation.

## Migration

Add `topics` only to notes that need cross-cutting membership. The remaining notes keep working through the `domain` fallback. This makes the migration additive, preserves content, and lets future notes declare several hubs at creation time.
