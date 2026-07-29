# LegalOSS

A community index of open-source legal software, live at
[legal-oss.com](https://legal-oss.com).

## Rules of the index

1. **Real repositories only.** Stats come from GitHub and Hugging Face, never
   from the submitter.
2. **One entry per repository.** Uniqueness is enforced on the case-insensitive
   `owner/repo` key; renames are re-canonicalized on refresh.
3. **Claims are proven, not asserted.** The claim flow fetches the user's GitHub
   OAuth token from Clerk and checks `permissions.admin` on the repo (with a
   numeric owner-ID fallback for personal repos); Hugging Face claims match the
   whoami-v2 identity or an organization role. Maintainers who would rather
   grant no OAuth scope at all can instead publish a per-person token in
   `legaloss-verify.txt` (or the README), which is read back anonymously — the
   only route that works for Hugging Face organizations without also granting
   `read-repos` over private repositories. Only the verified claimant can edit a
   project's name, tagline, website, categories, and maintainer's note.
4. **Featuring is editorial.** Admins (env allowlist, never in the repo) pick
   featured projects; the pick shows in the homepage featured strip.

Browsing needs no account. Signed-in members can star, review, comment, and
submit projects.

## Running it

See [SETUP.md](./SETUP.md).

## License

MIT — see [LICENSE](./LICENSE).

Made by [Eigenwelt Labs](https://eigenweltlabs.com).
