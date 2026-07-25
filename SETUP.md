# Setup (LegalOSS)

## Local dev (works out of the box)

```bash
pnpm install
pnpm db:setup            # drizzle-kit push + category seed
pnpm db:seed-projects    # optional starter content (live GitHub API)
pnpm dev
```

No env vars required: Clerk runs in keyless dev mode (temporary dev instance,
claim URL printed in the dev console and shown in-app). Keep the Clerk env vars
**absent — not empty** until you have real keys; defined-but-empty vars break
keyless mode.

## Manual steps (pending — require dashboard access)

1. **Claim the Clerk instance** (or create an app at dashboard.clerk.com), then
   put real keys into `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. **Enable the GitHub social connection** — Clerk Dashboard → SSO connections →
   Add connection → For all users → GitHub → enable for sign-up and sign-in.
   Dev instances use Clerk's shared OAuth credentials (no GitHub app needed);
   this is what powers both "sign in with GitHub" and the **claim flow**
   (`user.createExternalAccount` + `getUserOauthAccessToken`).
   Without it, claiming fails with "no GitHub connection".
3. **Production only:** GitHub OAuth app with custom credentials (Clerk gives
   you the callback URL), because shared dev credentials don't work in prod.
   Note: organizations with OAuth-app access restrictions may hide org repos
   from the shared dev app — org-repo claims need custom credentials approved
   by the org.
4. **Optional `GITHUB_TOKEN`** — fine-grained PAT, public repos, read-only.
   Raises the API budget for stats refresh from 60/h to 5,000/h.
5. **PostHog** — create a project (EU cloud) in the PostHog org, enable
   **Settings → Cookieless server hash mode** (required by
   `cookieless_mode: "on_reject"`), then set `NEXT_PUBLIC_POSTHOG_KEY` in
   `.env.local` and as a GitHub Actions secret. Absent key = analytics off.
6. **Brevo newsletter** — run `BREVO_API_KEY=… pnpm newsletter:setup` once (from
   a network allowed under Brevo → Security → Authorised IPs); it creates the
   "LegalOSS" list and prints `BREVO_LIST_ID`. Set both as env vars locally and
   as GitHub Actions secrets. Issues go out with `pnpm newsletter:send`
   (`--dry-run` to preview) against the production `DATABASE_PATH`.
7. **Site admins** — set `ADMIN_USER_IDS` (comma-separated Clerk user ids)
   locally and as a GitHub Actions secret. Admins get the Feature button on
   project pages; featured projects rotate on the homepage and feed the
   newsletter.
8. **Backfill / bulk indexing** — set `ADMIN_API_TOKEN` (locally and as a
   GitHub Actions secret), then POST the curated repo list — kept outside the
   repo on purpose — to `/api/admin/index-repos` with the Bearer token
   (idempotent; already-indexed repos come back as `exists`):
   `curl -X POST https://legal-oss.com/api/admin/index-repos -H "Authorization: Bearer $ADMIN_API_TOKEN" -H "Content-Type: application/json" -d '{"repos":[{"repo":"owner/name","categories":["platforms"],"tagline":"Short blurb"}]}'`

## Verification status (last local QA)

- Build, typecheck, all routes: passing.
- Browsing, directory filters/search/sort, detail pages with live GitHub stats +
  rendered READMEs: verified in headless browser against the real GitHub API.
- Sign-up/star/review/comment/claim: implemented and gated server-side; the
  interactive Clerk flows need a claimed instance + GitHub connection to be
  exercised end-to-end (headless keyless sign-up is blocked by Clerk's bot
  protection). No mocked flows were used — verify in a real browser after step 2.
