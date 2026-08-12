# Project instructions

Authoritative project instructions live in `AGENTS.md`, imported below so a single
file stays the source of truth for every agent that reads this repository.

@AGENTS.md

## Working from a phone / cloud session

Sessions started from claude.ai run in a sandbox with no access to the local
MacBook. Everything needed to work must therefore be committed:

- Reproduce the environment with `npm ci` (never a bare `npm install` that would
  drift `package-lock.json`).
- **Always commit and push when work is done**, including when the session was
  prompted from a phone. Do not leave finished work sitting uncommitted.
- Because a push to `main` deploys straight to GitHub Pages with no review step,
  `npm test` and `npm run build` must both pass *before* pushing, exactly as
  `.github/workflows/deploy.yml` runs them. That gate is the only thing between
  a phone prompt and the live site — never push past a failing test, and never
  weaken a test to make a push succeed.
- If tests or the build fail and cannot be fixed, commit the work on a branch
  instead and say so plainly, rather than pushing a broken `main`.
