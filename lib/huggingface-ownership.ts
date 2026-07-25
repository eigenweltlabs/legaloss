import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

const WHOAMI = "https://huggingface.co/api/whoami-v2";

export type HfOwnershipResult =
  | {
      owned: true;
      /** "user-match", "org-membership", or "org-<role>" (e.g. org-admin). */
      method: string;
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

  // Org-owned repo: the org only appears in whoami-v2 once the user granted the
  // app access to it (the read-repos scope + picking the org on the authorize
  // screen), so its presence already proves membership. Grant unless HF tells
  // us the member is explicitly low-privileged (read/contributor); admin/write
  // — or no role at all, when HF omits it over OAuth — can maintain it.
  const org = (me.orgs ?? []).find(
    (o) => o.name != null && o.name.toLowerCase() === target,
  );
  if (org) {
    const role = (org.roleInOrg ?? "").toLowerCase();
    if (role !== "read" && role !== "contributor") {
      return {
        owned: true,
        method: role ? `org-${role}` : "org-membership",
        hfUsername: username ?? owner,
      };
    }
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
