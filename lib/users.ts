import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** The subset of the Clerk user this mirror stores. */
type ClerkUserLike = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  externalAccounts: { provider: string; username?: string | null }[];
};

async function upsertUser(id: string, cu: ClerkUserLike | null): Promise<void> {
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || cu?.username || "Member";
  const github = cu?.externalAccounts.find(
    (a) => a.provider === "github" || a.provider === "oauth_github",
  );

  await db
    .insert(users)
    .values({
      id,
      username: cu?.username ?? null,
      name,
      imageUrl: cu?.imageUrl ?? null,
      githubLogin: github?.username ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username: cu?.username ?? null,
        name,
        imageUrl: cu?.imageUrl ?? null,
        githubLogin: github?.username ?? null,
        updatedAt: new Date(),
      },
    });
}

/**
 * Session-verified lazy mirror of the Clerk user into the local DB.
 * Called at the top of every authenticated mutation; returns the user id
 * or null when signed out.
 */
export async function ensureCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await upsertUser(userId, await currentUser());
  return userId;
}

export type MirroredUser = { id: string; label: string };

/**
 * Mirror a Clerk user the admin API names rather than the session user, so a
 * manually granted claim satisfies the users foreign key even when that person
 * has never written anything on the site. Returns null when Clerk has no such
 * user.
 */
export async function mirrorClerkUser(
  clerkUserId: string,
): Promise<MirroredUser | null> {
  const client = await clerkClient();
  try {
    const cu = await client.users.getUser(clerkUserId);
    await upsertUser(cu.id, cu);
    return {
      id: cu.id,
      label:
        cu.username ||
        cu.primaryEmailAddress?.emailAddress ||
        [cu.firstName, cu.lastName].filter(Boolean).join(" ") ||
        cu.id,
    };
  } catch {
    return null;
  }
}

export type Member = { id: string; label: string };

/**
 * Everyone who has signed in, newest first, for the admin claim picker. Read
 * from Clerk rather than the local users table: that table is only written on
 * an authenticated mutation, so someone who signed in and did nothing else —
 * exactly the person waiting on a manual grant — would be missing from it.
 */
export async function listMembers(limit = 200): Promise<Member[]> {
  const client = await clerkClient();
  try {
    const { data } = await client.users.getUserList({
      limit,
      orderBy: "-created_at",
    });
    return data.map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
      const email = u.primaryEmailAddress?.emailAddress;
      const primary = name || u.username || email || u.id;
      return {
        id: u.id,
        label: email && email !== primary ? `${primary} · ${email}` : primary,
      };
    });
  } catch {
    return [];
  }
}

/** Resolve an email address to a Clerk user id. */
export async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  const client = await clerkClient();
  try {
    const { data } = await client.users.getUserList({
      emailAddress: [email],
      limit: 2,
    });
    // Clerk enforces email uniqueness, but a manual claim grant is not the
    // place to guess between two accounts.
    return data.length === 1 ? data[0].id : null;
  } catch {
    return null;
  }
}
