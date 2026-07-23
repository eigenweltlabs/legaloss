# Open Legal Index

A community index of open-source legal software, by [Eigenwelt Labs](https://eigenweltlabs.com).
Paper-white editorial surfaces, deep ultramarine, liquid glass — the "Deep Current" design language.

Every entry is a real GitHub repository with live stats (stars, forks, issues, license,
activity) pulled from the GitHub API and cached server-side. Each repository can be
indexed exactly once. Browsing needs no account; signed-in members can star, review,
comment, and submit projects. A project's page belongs to whoever proves — through
GitHub OAuth — that they hold admin rights on the repository.

## Stack

- **Next.js 16** (App Router, `proxy.ts` request interception), React 19, TypeScript
- **Clerk** for auth (optional sign-up; GitHub social connection for ownership claims)
- **Drizzle ORM + better-sqlite3** (`data/app.db`, WAL mode)
- Plain CSS design system in `app/globals.css` — no Tailwind

## Getting started

```bash
pnpm install
pnpm db:setup            # push schema + seed the 12-category taxonomy
pnpm db:seed-projects    # optional: index 8 real starter projects via the GitHub API
pnpm dev
```

On first run Clerk starts in **keyless dev mode** — auth works immediately with a
temporary dev instance; claim it from the banner in the app (or `.clerk/.tmp/keyless.json`)
to configure it properly. See [SETUP.md](./SETUP.md) for the full production checklist,
including enabling the GitHub social connection required by the claim flow.

## How the pieces fit

| Area | Where |
|---|---|
| DB schema (projects, stats cache, categories, stars, comments, reviews, claims) | `lib/db/schema.ts` |
| GitHub API client + URL parsing + README rewriting | `lib/github.ts` |
| Stats/README staleness + list/detail queries | `lib/projects.ts` |
| Ownership verification (Clerk OAuth token → GitHub `permissions.admin`) | `lib/github-ownership.ts` |
| All mutations (submit, star, comment, review, claim, edit) | `app/actions.ts` |
| Lazy Clerk→DB user mirror | `lib/users.ts` |
| Design tokens + components ("Deep Current") | `app/globals.css` |

GitHub stats refresh when older than 1 hour, READMEs after 24 hours; stale data is
served if GitHub is unreachable. Unauthenticated GitHub API allows 60 requests/hour —
set `GITHUB_TOKEN` (fine-grained PAT, public read-only) for the 5,000/hour pool.

## Rules of the index

1. **Real repositories only.** Stats come from GitHub, never from the submitter.
2. **One entry per repository.** Uniqueness is enforced on the case-insensitive
   `owner/repo` key; renames are re-canonicalized on refresh.
3. **Claims are proven, not asserted.** The claim flow fetches the user's GitHub
   OAuth token from Clerk and checks `permissions.admin` on the repo (with a
   numeric owner-ID fallback for personal repos). Only the verified claimant can
   edit a project's name, tagline, website, and categories.
