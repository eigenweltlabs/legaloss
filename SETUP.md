# Setup

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

## Verification status (last local QA)

- Build, typecheck, all routes: passing.
- Browsing, directory filters/search/sort, detail pages with live GitHub stats +
  rendered READMEs: verified in headless browser against the real GitHub API.
- Sign-up/star/review/comment/claim: implemented and gated server-side; the
  interactive Clerk flows need a claimed instance + GitHub connection to be
  exercised end-to-end (headless keyless sign-up is blocked by Clerk's bot
  protection). No mocked flows were used — verify in a real browser after step 2.
