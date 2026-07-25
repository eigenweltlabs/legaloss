import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

const WHOAMI = "https://huggingface.co/api/whoami-v2";

export type HfOwnershipResult =
  | {
      owned: true;
      method: "user-match" | "org-membership";
      hfUsername: string;
    }
  | {
      owned: false;
      reason:
        | "no-hf-connection"
        | "token-revoked"
        | "not-owner"
        | "hf-error";
      hfUsername?: string;
    };

/**
 * Proves the Clerk user controls a Hugging Face repo, mirroring the GitHub
 * flow. Fetches the user's HF OAuth token from Clerk, then asks whoami-v2 who
 * they are: ownership holds when the repo owner matches their username, or the
 * owner is an organization they belong to.
 */
export async function verifyHfOwnership(
  userId: string,
  owner: string,
): Promise<HfOwnershipResult> {
  const client = await clerkClient();

  let token: string | undefined;
  try {
    const { data: tokens } = await client.users.getUserOauthAccessToken(
      userId,
      "huggingface",
    );
    token = tokens[0]?.token;
  } catch {
    token = undefined;
  }
  if (!token) return { owned: false, reason: "no-hf-connection" };

  const res = await fetch(WHOAMI, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "legaloss" },
    cache: "no-store",
  });
  if (res.status === 401) return { owned: false, reason: "token-revoked" };
  if (!res.ok) return { owned: false, reason: "hf-error" };

  const me = (await res.json()) as {
    name?: string;
    orgs?: { name?: string; roleInOrg?: string }[];
  };
  const username = me.name ?? undefined;
  const target = owner.toLowerCase();

  if (username && username.toLowerCase() === target) {
    return { owned: true, method: "user-match", hfUsername: username };
  }
  // Only admin/write members can maintain an org's repos — mere membership
  // (read/contributor) must not grant a claim, matching the GitHub side's
  // per-repo `permissions.admin` bar.
  const adminOfOrg = (me.orgs ?? []).some(
    (o) =>
      (o.name ?? "").toLowerCase() === target &&
      o.name != null &&
      (o.roleInOrg === "admin" || o.roleInOrg === "write"),
  );
  if (adminOfOrg) {
    return {
      owned: true,
      method: "org-membership",
      hfUsername: username ?? owner,
    };
  }
  return { owned: false, reason: "not-owner", hfUsername: username };
}

/** Whether the user has a Hugging Face external account connected in Clerk. */
export async function hasHfConnection(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.externalAccounts.some(
    (a) =>
      (a.provider === "huggingface" || a.provider === "oauth_huggingface") &&
      a.verification?.status === "verified",
  );
}
