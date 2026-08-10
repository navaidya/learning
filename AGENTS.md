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

## Quality and workflow

- Add or update automated tests whenever calculations or content validation changes, including missing data and boundaries.
- Before declaring work complete, run `npm test` and `npm run build`; do not suppress TypeScript errors or add `any` merely to make a build pass.
- Keep commits small and single-purpose. Preserve established structure and patterns unless a change is justified.
- Treat interactive quizzes, search, news ingestion, spaced repetition, and all AI features as out of scope unless explicitly requested.

