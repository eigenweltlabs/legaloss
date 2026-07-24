# LegalOSS launch email — maintainer outreach draft

Draft for Chris to review and send manually. Nothing here is wired to any
sending tool. Suggested mechanics: send individually, or in small BCC batches
of 10–15 grouped by category, from chris@eigenweltlabs.com. Replace the
`{{placeholders}}` per recipient — `{{first_name}}` falls back to the GitHub
handle if no real name is public. Aim to have these out 3–5 days before the
public launch date so maintainers who want to claim, opt out, or post
alongside us have time to do so.

---

## Primary email

**Subject options:**

1. {{project_name}} is listed on legal-oss.com — claim your page before launch
2. We indexed {{project_name}} in a directory of open-source legal software
3. Launching an index of open-source legal software — {{project_name}} is in it

**Body:**

Hi {{first_name}},

I'm Chris from Eigenwelt Labs, an AI lab in Berlin. We've built LegalOSS, an
index of actively maintained open-source legal software — platforms, contract
tooling, case-law data, rules-as-code, agent skills, MCP servers, and so on.
It goes public at https://legal-oss.com in a few days, with around 135
projects listed at launch. {{project_name}} is one of them:

{{project_url_on_legaloss}}

To be clear about what the page is: stats (stars, forks, issues, license,
activity) come live from the GitHub API. Nothing was copied from your repo —
the page links to it and points people there.

The page is yours if you want it. Claiming takes about a minute: sign in,
connect the GitHub account that has admin rights on the repo, and we verify
the permission server-side. We only read your public identity — no repository
scopes. Once verified, you control the tagline, categories, and a maintainer
note on the page, and you get the maintainer mark.

Two things around launch:

- If you claim before launch day, we'd like to feature {{project_name}} on
  the homepage and mention it in the first issue of the newsletter.
- On launch day itself, it would mean a lot if you shared the index or posted
  alongside us. The whole point is to give open-source legal software more
  visibility, and that works best if maintainers are part of it.

And the opposite is just as easy: if you'd rather {{project_name}} not be
listed, reply with one line and I'll remove the entry. No questions.

Happy to answer anything — just reply.

Best,
Chris

Chris Poensgen
Eigenwelt Labs, Berlin
chris@eigenweltlabs.com
https://eigenweltlabs.com

---

## Short variant

For well-known projects and maintainers who get a lot of email.

**Subject:** {{project_name}} on legal-oss.com — one thing before we launch

**Body:**

Hi {{first_name}},

I'm Chris from Eigenwelt Labs in Berlin. We're launching legal-oss.com in a
few days — an index of ~135 actively maintained open-source legal projects,
with stats pulled live from GitHub, and {{project_name}} is one of them:
{{project_url_on_legaloss}}. You can claim the page in about a minute via
GitHub OAuth (admin check, no repo scopes) and control the tagline,
categories, and a maintainer note; claim before launch and we'll feature the
project on the homepage and in the first newsletter. If you'd rather not be
listed, one reply and it's gone.

Best,
Chris — Eigenwelt Labs, Berlin

---

## Launch-day checklist

- **T-5d** — Emails out to all ~135 maintainers. Track replies: claims,
  opt-outs, questions. Process opt-outs same day.
- **T-4d to T-1d** — Reply to questions, verify claims are landing, pick the
  featured set from projects that claimed. Fix anything maintainers flag on
  their pages.
- **T-0** — Public post (site live, announcement on the usual channels).
  Short heads-up reply to maintainers who said they'd share, with the post
  link.
- **T+1** — Newsletter issue #1: launch recap plus the first featured
  projects (claimed maintainers first).
