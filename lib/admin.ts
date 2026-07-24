import "server-only";

/**
 * Site admins: comma-separated Clerk user ids in ADMIN_USER_IDS. Admins curate
 * the index (feature/unfeature projects); everything else stays community- or
 * maintainer-owned. Kept as an env allowlist so the open-source repo carries
 * no privileged identities.
 */
const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export function isAdminUser(userId: string | null | undefined): boolean {
  return Boolean(userId && ADMIN_IDS.has(userId));
}
