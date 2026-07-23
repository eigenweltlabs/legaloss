import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Session-verified lazy mirror of the Clerk user into the local DB.
 * Called at the top of every authenticated mutation; returns the user id
 * or null when signed out.
 */
export async function ensureCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") ||
    cu?.username ||
    "Member";
  const github = cu?.externalAccounts.find(
    (a) => a.provider === "github" || a.provider === "oauth_github",
  );

  await db
    .insert(users)
    .values({
      id: userId,
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

  return userId;
}
