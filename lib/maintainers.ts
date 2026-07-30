import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMaintainers } from "@/lib/db/schema";

/** GitHub usernames: alphanumerics and single interior hyphens, max 39 chars. */
const GITHUB_LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Trim, strip a pasted @ or profile URL, lowercase. Null when not a valid login. */
export function normalizeGithubLogin(input: string): string | null {
  const login = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  return GITHUB_LOGIN_RE.test(login) ? login : null;
}

/** Login of the signed-in member's verified GitHub connection, lowercased. */
export async function currentGithubLogin(): Promise<string | null> {
  const cu = await currentUser();
  const github = cu?.externalAccounts.find(
    (a) =>
      (a.provider === "github" || a.provider === "oauth_github") &&
      a.verification?.status === "verified",
  );
  return github?.username?.toLowerCase() ?? null;
}

export type MaintainerRow = {
  id: number;
  githubLogin: string;
  createdAt: Date;
};

/** The additional maintainers granted on a project, oldest grant first. */
export async function listProjectMaintainers(
  projectId: number,
): Promise<MaintainerRow[]> {
  return db
    .select({
      id: projectMaintainers.id,
      githubLogin: projectMaintainers.githubLogin,
      createdAt: projectMaintainers.createdAt,
    })
    .from(projectMaintainers)
    .where(eq(projectMaintainers.projectId, projectId))
    .orderBy(asc(projectMaintainers.createdAt));
}

/**
 * Whether this member may edit the project page: the verified claimant, or
 * anyone whose connected GitHub account the claimant has granted maintainer
 * rights to. Managing the grants themselves stays with the claimant.
 */
export async function canEditProject(
  project: { id: number; claimedById: string | null },
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  if (project.claimedById === userId) return true;

  const login = await currentGithubLogin();
  if (!login) return false;
  const rows = await db
    .select({ id: projectMaintainers.id })
    .from(projectMaintainers)
    .where(
      and(
        eq(projectMaintainers.projectId, project.id),
        eq(projectMaintainers.githubLogin, login),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
