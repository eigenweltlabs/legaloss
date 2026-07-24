# LegalOSS

A community index of open-source legal software, live at
[legal-oss.com](https://legal-oss.com). "Solar" design language: warm cream
paper, vermilion signal, condensed uppercase display, JetBrains Mono UI, pill
buttons, a restrained amount of frosted glass.

Every entry is a real GitHub repository with live stats (stars, forks, issues,
license, activity) pulled from the GitHub API and cached server-side. Each
repository can be indexed exactly once. Browsing needs no account; signed-in
members can star, review, comment, and submit projects. A project's page
belongs to whoever proves — through GitHub OAuth — that they hold admin rights
on the repository; tagline, categories, and the maintainer's note are
maintainer-curated after claiming. Site admins can feature projects, which
puts them in the homepage rotator and the next newsletter issue.

## Stack

- **Next.js 16** (App Router, `proxy.ts` request interception), React 19, TypeScript
- **Clerk** for auth (optional sign-up; GitHub social connection for ownership claims)
- **Drizzle ORM + better-sqlite3** (`data/app.db`, WAL mode)
- **PostHog** product analytics (EU cloud, cookieless before consent)
- **Brevo** for the featured-projects newsletter
- Plain CSS design system in `app/globals.css` — no Tailwind

## Getting started

```bash
pnpm install
pnpm db:setup            # push schema + seed the 20-category taxonomy
pnpm db:seed-projects    # optional: index 8 real starter projects via the GitHub API
pnpm dev
```

Bulk indexing (the curated launch list is intentionally kept out of the repo)
happens at runtime: POST
`{"repos":[{"repo":"owner/name","categories":[...],"tagline":"..."}]}` to
`/api/admin/index-repos` with `Authorization: Bearer $ADMIN_API_TOKEN` —
idempotent, already-indexed repos are skipped (see [SETUP.md](./SETUP.md)).

Clerk keys live in `.env.local` (see `.env.example`); without them Clerk runs
in keyless dev mode. See [SETUP.md](./SETUP.md) for the checklist, including
the GitHub social connection required by the claim flow and the PostHog/Brevo
setup. PostHog and the newsletter are optional: with their env vars absent,
analytics is disabled and the subscribe endpoint reports itself unconfigured.

## How the pieces fit

| Area | Where |
|---|---|
| DB schema (projects incl. featured/maintainer note, stats/readme/contributor caches, categories, stars, comments, reviews, claims) | `lib/db/schema.ts` |
| GitHub API client + URL parsing + README/video rewriting | `lib/github.ts` |
| Staleness logic + list/detail/featured queries + browse filters | `lib/projects.ts` |
| Ownership verification (Clerk OAuth token → GitHub `permissions.admin`) | `lib/github-ownership.ts` |
| Provisional auto-categorization of submissions | `lib/auto-categories.ts` |
| Site-admin allowlist (`ADMIN_USER_IDS`) | `lib/admin.ts` |
| All mutations (submit, star, comment, review, claim, edit, feature) | `app/actions.ts` |
| Token-gated bulk indexing (`ADMIN_API_TOKEN` Bearer auth) | `app/api/admin/index-repos/route.ts` |
| Lazy Clerk→DB user mirror | `lib/users.ts` |
| Analytics: cookieless-by-default PostHog + consent banner | `components/posthog-analytics.tsx`, `components/consent-banner.tsx` |
| Newsletter: signup route + footer form + Brevo scripts | `app/api/subscribe/route.ts`, `components/newsletter-form.tsx`, `scripts/*newsletter*.ts` |
| SEO: DB-driven sitemap, robots, per-project metadata + JSON-LD | `app/sitemap.ts`, `app/robots.ts`, `app/projects/[owner]/[repo]/page.tsx` |
| Design tokens + components ("Solar") | `app/globals.css` |

GitHub stats refresh when older than 1 hour; READMEs and contributors after
24 hours; stale data is served if GitHub is unreachable. Unauthenticated GitHub
API allows 60 requests/hour — set `GITHUB_TOKEN` (fine-grained PAT, public
read-only) for the 5,000/hour pool.

## Rules of the index

1. **Real repositories only.** Stats come from GitHub, never from the submitter.
2. **One entry per repository.** Uniqueness is enforced on the case-insensitive
   `owner/repo` key; renames are re-canonicalized on refresh.
3. **Claims are proven, not asserted.** The claim flow fetches the user's GitHub
   OAuth token from Clerk and checks `permissions.admin` on the repo (with a
   numeric owner-ID fallback for personal repos). Only the verified claimant can
   edit a project's name, tagline, website, categories, and maintainer's note.
4. **Featuring is editorial.** Admins (env allowlist, never in the repo) pick
   featured projects; the pick shows in the homepage rotator and goes out in
   the next newsletter issue.

## Analytics & consent

PostHog runs in `cookieless_mode: "on_reject"`: visitors who accept the cookie
banner get normal cookie-based analytics (including masked-input session
replay); visitors who decline — or haven't decided — are counted anonymously
via PostHog's server-side hash with nothing stored on their device. The
project needs "Cookieless server hash mode" enabled in PostHog settings.
`?loss-internal=1` flags your own browser so team visits never pollute the
numbers (`?loss-internal=0` clears it).

## Newsletter

Signups post to `/api/subscribe`, which adds the address to a Brevo list
(`BREVO_LIST_ID`). `pnpm newsletter:setup` creates the list once;
`pnpm newsletter:send` composes one issue from all featured-but-unannounced
projects, sends it as a Brevo campaign, and stamps them announced
(`--dry-run` previews without sending).
