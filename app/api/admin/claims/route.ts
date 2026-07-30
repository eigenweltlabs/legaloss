import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { claims, projectMaintainers, projects } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { hfKey } from "@/lib/huggingface";
import { detectSource } from "@/lib/index-repo";
import { projectHref } from "@/lib/sources";
import { findClerkUserIdByEmail, mirrorClerkUser } from "@/lib/users";

/**
 * Manual claim grants for site admins — the break-glass path when a maintainer
 * can prove control out of band but neither self-serve route fits (an
 * organization that forbids OAuth apps outright, a repo whose default branch
 * is protected against the verification file, a handover between maintainers).
 *
 * POST { grants: [{ repo, userId | email, force? }] } with
 * "Authorization: Bearer $ADMIN_API_TOKEN". Refuses to take a project away
 * from an existing claimant unless force is set. DELETE { repos: [...] }
 * releases claims. Requires ADMIN_API_TOKEN; without it every request is
 * rejected.
 *
 * Every grant lands in the claims audit log with method "admin-grant", so a
 * hand-verified claim is never indistinguishable from a proven one.
 */

const grantSchema = z
  .object({
    repo: z.string().min(1),
    userId: z.string().min(1).optional(),
    email: z.string().email().optional(),
    /** Reassign a project that someone else already claimed. */
    force: z.boolean().default(false),
  })
  .refine((g) => Boolean(g.userId || g.email), {
    message: "Each grant needs a userId or an email.",
  });

const postSchema = z.object({ grants: z.array(grantSchema).min(1).max(50) });
const deleteSchema = z.object({ repos: z.array(z.string().min(1)).min(1).max(50) });

type GrantResult = {
  repo: string;
  status: "granted" | "unchanged" | "claimed-by-other" | "unknown-repo" | "unknown-user";
  claimant?: string;
  message?: string;
};

/** projects.fullNameKey for either source, from anything detectSource accepts. */
function keyFor(input: string): string | null {
  const detected = detectSource(input);
  if (!detected) return null;
  return detected.source === "huggingface"
    ? hfKey(detected.type, detected.owner, detected.repo)
    : `${detected.owner}/${detected.repo}`.toLowerCase();
}

async function projectByRef(input: string) {
  const key = keyFor(input);
  if (!key) return null;
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.fullNameKey, key))
    .limit(1);
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = postSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const results: GrantResult[] = [];
  for (const grant of body.data.grants) {
    const project = await projectByRef(grant.repo);
    if (!project) {
      results.push({
        repo: grant.repo,
        status: "unknown-repo",
        message: "Not in the index — index it first.",
      });
      continue;
    }

    const clerkUserId =
      grant.userId ?? (await findClerkUserIdByEmail(grant.email!));
    const user = clerkUserId ? await mirrorClerkUser(clerkUserId) : null;
    if (!user) {
      results.push({
        repo: grant.repo,
        status: "unknown-user",
        message: grant.userId
          ? "No Clerk user with that id."
          : "No single Clerk user with that email — they may not have signed in yet.",
      });
      continue;
    }

    if (project.claimedById === user.id) {
      results.push({ repo: grant.repo, status: "unchanged", claimant: user.label });
      continue;
    }
    if (project.claimedById && !grant.force) {
      results.push({
        repo: grant.repo,
        status: "claimed-by-other",
        message: "Already claimed by another account; pass force to reassign.",
      });
      continue;
    }

    await db
      .update(projects)
      .set({ claimedById: user.id, claimedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    await db.insert(claims).values({
      projectId: project.id,
      userId: user.id,
      githubLogin: user.label,
      method: "admin-grant",
    });

    revalidatePath(projectHref(project));
    revalidatePath(`${projectHref(project)}/claim`);
    results.push({ repo: grant.repo, status: "granted", claimant: user.label });
  }

  revalidatePath("/");
  revalidatePath("/projects");

  const count = (status: GrantResult["status"]) =>
    results.filter((r) => r.status === status).length;
  return NextResponse.json({
    results,
    granted: count("granted"),
    errors: results.length - count("granted") - count("unchanged"),
  });
}

/** Release claims — the undo for a grant made in error. */
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = deleteSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const results: { repo: string; status: "released" | "unclaimed" | "unknown-repo" }[] =
    [];
  for (const repo of body.data.repos) {
    const project = await projectByRef(repo);
    if (!project) {
      results.push({ repo, status: "unknown-repo" });
      continue;
    }
    if (!project.claimedById) {
      results.push({ repo, status: "unclaimed" });
      continue;
    }
    await db
      .update(projects)
      .set({ claimedById: null, claimedAt: null, updatedAt: new Date() })
      .where(eq(projects.id, project.id));
    // Grants belong to the claimant; they don't outlive the claim.
    await db
      .delete(projectMaintainers)
      .where(eq(projectMaintainers.projectId, project.id));
    revalidatePath(projectHref(project));
    revalidatePath(`${projectHref(project)}/claim`);
    results.push({ repo, status: "released" });
  }

  revalidatePath("/");
  revalidatePath("/projects");
  return NextResponse.json({
    results,
    released: results.filter((r) => r.status === "released").length,
  });
}
