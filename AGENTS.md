# AI Infrastructure Learning OS — Project Instructions

## Product and architecture

- This is a personal **AI Infrastructure Learning Operating System** for tracking technical knowledge, reviews, labs, projects, and learning activity.
- Keep the Git repository as the source of truth. Learning content must remain useful and readable in Markdown even if the site is unavailable.
- Build static-first with Astro, TypeScript, Markdown/MDX, YAML/JSON, GitHub Actions, and GitHub Pages.
- Do not introduce a backend, database, authentication, server-side API, container/Kubernetes deployment, LLM integration, or third-party hosted service without explicit approval.
- Keep dependencies minimal. Prefer Astro platform features and small local utilities over dashboard frameworks or large UI libraries.

## Content and data

- Markdown/MDX under `content/` is authoritative for the knowledge book, labs, projects, and inbox.
- Preserve existing user-authored material. Migrate or reorganize it only when documented and justified.
- Frontmatter is optional unless a collection schema makes a field required. Use safe defaults for missing optional fields.
- Validate frontmatter dates, statuses, numeric ranges, and quiz/lab counts in schemas or focused validation utilities.
- Keep cross-cutting structured data in `data/`; do not hard-code learning facts in UI components.

## Application design

- Keep business rules in focused deterministic TypeScript modules under `src/lib/`. UI components consume calculated view models; they must not recalculate progress, learning debt, recommendations, or activity.
- Prefer pure functions. Missing learning metrics must normalize available weights rather than be treated as zero.
- Supported statuses are exactly: `not_started`, `learning`, `practicing`, `review`, and `mastered`.
- Use semantic HTML, keyboard-accessible controls, visible focus states, sufficient contrast, and responsive layouts. Prioritize readability and information density over decoration.
- Build every internal link with `withBase()` from `src/lib/url.ts`. The site is served from a `/<repo>` base on GitHub Pages, so hardcoded root-relative hrefs 404 in production while still working locally.
- Curated learning resources live in `data/resources.yaml`, never inline in components. Only add a URL after verifying it resolves, and prefer primary sources over vendor marketing pages.

## Engineering Radar

- Stay static/serverless: the Radar is a Node collector script run in GitHub Actions or manually, writing plain JSON that the Astro build reads. Never add a runtime API, database, or server for it.
- Sources must be primary: official project blogs or their own release feeds only (e.g. a repo's GitHub `releases.atom`). No generic aggregators, no scraped HTML.
- Treat remote feed content as untrusted: normalize it to plain text (strip tags/scripts, decode entities, cap length) and never render raw remote HTML on the page.
- Classification, importance, architecture-shift, and relevance scoring must stay deterministic, rule-based logic in `src/lib/news/` — no LLM or external API call, per the no-backend/no-LLM constraint above.
- Degrade gracefully: one source failing must never block others or erase previously-collected data; if every source fails, retain prior data and exit successfully rather than writing an empty result.

## Quality and workflow

- Add or update automated tests whenever calculations or content validation changes, including missing data and boundaries.
- Before declaring work complete, run `npm test` and `npm run build`; do not suppress TypeScript errors or add `any` merely to make a build pass.
- Keep commits small and single-purpose. Preserve established structure and patterns unless a change is justified.
- Treat interactive quizzes, search, spaced repetition, and general AI features as out of scope unless explicitly requested.

