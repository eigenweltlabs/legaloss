import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

const GH_API = "https://api.github.com";
const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "open-legal-index",
});

export type OwnershipResult =
  | {
      owned: true;
      method: "permissions" | "provider-user-id" | "owner-login";
      githubLogin: string;
    }
  | {
      owned: false;
      reason:
        | "no-github-connection"
        | "token-revoked"
        | "repo-not-found"
        | "not-owner"
        | "github-error";
      githubLogin?: string;
    };

/**
 * Proves the Clerk user controls the repo:
 * 1. GET /repos with the user's OAuth token — `permissions.admin` covers both
 *    personal and org-owned repos, and works scope-free for public repos.
 * 2. Fallback for personal repos: Clerk's stored GitHub numeric user id vs
 *    repo.owner.id (rename-proof), then a login comparison via GET /user.
 */
export async function verifyRepoOwnership(
  userId: string,
  owner: string,
  repo: string,
): Promise<OwnershipResult> {
  const client = await clerkClient();

  let token: string | undefined;
  try {
    const { data: tokens } = await client.users.getUserOauthAccessToken(
      userId,
      "github",
    );
    token = tokens[0]?.token;
  } catch {
    token = undefined;
  }
  if (!token) return { owned: false, reason: "no-github-connection" };

  const repoRes = await fetch(
    `${GH_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: ghHeaders(token), cache: "no-store" },
  );
  if (repoRes.status === 401) return { owned: false, reason: "token-revoked" };
  if (repoRes.status === 404) return { owned: false, reason: "repo-not-found" };
  if (!repoRes.ok) return { owned: false, reason: "github-error" };
  const repoJson = await repoRes.json();

  // The authenticated user's GitHub login, for the audit trail.
  let myLogin: string | undefined;
  const meRes = await fetch(`${GH_API}/user`, {
    headers: ghHeaders(token),
    cache: "no-store",
  });
  if (meRes.ok) myLogin = (await meRes.json()).login;

  const perms = repoJson.permissions as
    | { admin: boolean; push: boolean; pull: boolean }
    | undefined;
  if (perms?.admin === true) {
    return {
      owned: true,
      method: "permissions",
      githubLogin: myLogin ?? repoJson.owner.login,
    };
  }

  if (repoJson.owner?.type === "User") {
    const user = await client.users.getUser(userId);
    const gh = user.externalAccounts.find(
      (a) => a.provider === "github" || a.provider === "oauth_github",
    );
    if (gh && Number(gh.providerUserId) === repoJson.owner.id) {
      return {
        owned: true,
        method: "provider-user-id",
        githubLogin: gh.username ?? repoJson.owner.login,
      };
    }
    if (
      myLogin &&
      myLogin.toLowerCase() === String(repoJson.owner.login).toLowerCase()
    ) {
      return { owned: true, method: "owner-login", githubLogin: myLogin };
    }
  }

  return { owned: false, reason: "not-owner", githubLogin: myLogin };
}

/** Whether the user has a GitHub external account connected in Clerk. */
export async function hasGithubConnection(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.externalAccounts.some(
    (a) =>
      (a.provider === "github" || a.provider === "oauth_github") &&
      a.verification?.status === "verified",
  );
}
