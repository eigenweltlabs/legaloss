"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  categories,
  claims,
  comments,
  projectCategories,
  projects,
  projectStats,
  reviews,
  stars,
} from "@/lib/db/schema";
import { autoCategorize } from "@/lib/auto-categories";
import { fetchRepo, parseGitHubUrl } from "@/lib/github";
import { verifyRepoOwnership } from "@/lib/github-ownership";
import { ensureCurrentUser } from "@/lib/users";

type ActionError = { ok: false; error: string };

function fail(error: string): ActionError {
  return { ok: false, error };
}

function projectPath(p: { owner: string; repo: string }) {
  return `/projects/${p.owner}/${p.repo}`;
}

function revalidateProject(p: { owner: string; repo: string }) {
  revalidatePath(projectPath(p));
  revalidatePath("/projects");
  revalidatePath("/");
}

async function getProjectById(id: number) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

/* ============================== Submit ============================== */

export type RepoPreview = {
  ok: true;
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  licenseSpdx: string | null;
  topics: string[];
  archived: boolean;
};

export async function previewRepo(
  input: string,
): Promise<RepoPreview | (ActionError & { existingPath?: string })> {
  const parsed = parseGitHubUrl(input);
  if (!parsed) {
    return fail(
      "That doesn't look like a GitHub repository. Paste a URL like github.com/owner/repo.",
    );
  }

  const result = await fetchRepo(parsed.owner, parsed.repo);
  if (result.error) return fail(result.error.message);
  const d = result.data;
  if (d.isPrivate) return fail("Only public repositories can be indexed.");

  const key = d.fullName.toLowerCase();
  const existing = await db
    .select({ owner: projects.owner, repo: projects.repo })
    .from(projects)
    .where(eq(projects.fullNameKey, key))
    .limit(1);
  if (existing[0]) {
    return {
      ...fail(`${d.fullName} is already in the index.`),
      existingPath: projectPath(existing[0]),
    };
  }

  return {
    ok: true,
    owner: d.owner,
    repo: d.repo,
    fullName: d.fullName,
    description: d.description,
    stars: d.stars,
    language: d.language,
    licenseSpdx: d.licenseSpdx,
    topics: d.topics,
    archived: d.archived,
  };
}

const submitSchema = z.object({
  url: z.string().min(1),
});

export async function submitProject(
  input: z.infer<typeof submitSchema>,
): Promise<{ ok: true; path: string } | (ActionError & { existingPath?: string })> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to submit a project.");

  const body = submitSchema.safeParse(input);
  if (!body.success) {
    return fail(body.error.issues[0]?.message ?? "Invalid submission.");
  }

  const parsed = parseGitHubUrl(body.data.url);
  if (!parsed) return fail("Invalid GitHub repository URL.");

  // Fetch canonical data server-side; never trust the client's preview.
  const result = await fetchRepo(parsed.owner, parsed.repo);
  if (result.error) return fail(result.error.message);
  const d = result.data;
  if (d.isPrivate) return fail("Only public repositories can be indexed.");

  // Tagline and categories are maintainer-curated after claiming; submissions
  // only get a provisional auto-categorization from GitHub topics/description.
  const provisionalSlugs = autoCategorize(d.topics, d.description, d.repo);
  const catRows = provisionalSlugs.length
    ? await db
        .select()
        .from(categories)
        .where(inArray(categories.slug, provisionalSlugs))
    : [];

  const key = d.fullName.toLowerCase();
  let projectId: number;
  try {
    const inserted = await db
      .insert(projects)
      .values({
        owner: d.owner,
        repo: d.repo,
        fullNameKey: key,
        name: d.repo,
        submittedById: userId,
      })
      .returning({ id: projects.id });
    projectId = inserted[0].id;
  } catch {
    // Unique-constraint race: someone indexed it between preview and submit.
    const existing = await db
      .select({ owner: projects.owner, repo: projects.repo })
      .from(projects)
      .where(eq(projects.fullNameKey, key))
      .limit(1);
    return {
      ...fail(`${d.fullName} is already in the index.`),
      existingPath: existing[0] ? projectPath(existing[0]) : undefined,
    };
  }

  await db.insert(projectStats).values({
    projectId,
    stars: d.stars,
    forks: d.forks,
    openIssues: d.openIssues,
    subscribers: d.subscribers,
    language: d.language,
    licenseSpdx: d.licenseSpdx,
    licenseName: d.licenseName,
    topics: d.topics,
    description: d.description,
    homepage: d.homepage,
    defaultBranch: d.defaultBranch,
    pushedAt: d.pushedAt,
    archived: d.archived,
    fetchedAt: new Date(),
  });
  if (catRows.length > 0) {
    await db.insert(projectCategories).values(
      catRows.map((c) => ({ projectId, categoryId: c.id })),
    );
  }

  revalidateProject(d);
  return { ok: true, path: projectPath(d) };
}

/* ============================== Stars ============================== */

export async function toggleStar(
  projectId: number,
): Promise<{ ok: true; starred: boolean } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to star projects.");

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");

  const existing = await db
    .select()
    .from(stars)
    .where(and(eq(stars.projectId, projectId), eq(stars.userId, userId)))
    .limit(1);

  let starred: boolean;
  if (existing[0]) {
    await db
      .delete(stars)
      .where(and(eq(stars.projectId, projectId), eq(stars.userId, userId)));
    starred = false;
  } else {
    await db.insert(stars).values({ projectId, userId }).onConflictDoNothing();
    starred = true;
  }

  revalidateProject(project);
  return { ok: true, starred };
}

/* ============================== Comments ============================== */

const commentSchema = z.object({
  projectId: z.number().int(),
  body: z.string().trim().min(1, "Write something first.").max(4000),
});

export async function addComment(
  input: z.infer<typeof commentSchema>,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to comment.");

  const body = commentSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid comment.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");

  await db.insert(comments).values({
    projectId: project.id,
    userId,
    body: body.data.body,
  });

  revalidatePath(projectPath(project));
  return { ok: true };
}

export async function deleteComment(
  commentId: number,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  const comment = rows[0];
  if (!comment) return fail("Comment not found.");
  if (comment.userId !== userId) return fail("You can only delete your own comments.");

  await db.delete(comments).where(eq(comments.id, commentId));

  const project = await getProjectById(comment.projectId);
  if (project) revalidatePath(projectPath(project));
  return { ok: true };
}

/* ============================== Reviews ============================== */

const reviewSchema = z.object({
  projectId: z.number().int(),
  rating: z.number().int().min(1, "Pick a rating.").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(4000).optional(),
});

export async function upsertReview(
  input: z.infer<typeof reviewSchema>,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to review.");

  const body = reviewSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid review.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");

  await db
    .insert(reviews)
    .values({
      projectId: project.id,
      userId,
      rating: body.data.rating,
      title: body.data.title || null,
      body: body.data.body || null,
    })
    .onConflictDoUpdate({
      target: [reviews.projectId, reviews.userId],
      set: {
        rating: body.data.rating,
        title: body.data.title || null,
        body: body.data.body || null,
        updatedAt: new Date(),
      },
    });

  revalidateProject(project);
  return { ok: true };
}

export async function deleteReview(
  reviewId: number,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const rows = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  const review = rows[0];
  if (!review) return fail("Review not found.");
  if (review.userId !== userId) return fail("You can only delete your own review.");

  await db.delete(reviews).where(eq(reviews.id, reviewId));

  const project = await getProjectById(review.projectId);
  if (project) revalidateProject(project);
  return { ok: true };
}

/* ============================== Claim ============================== */

export type ClaimResult =
  | { ok: true; method: string }
  | (ActionError & {
      reason?:
        | "no-github-connection"
        | "token-revoked"
        | "repo-not-found"
        | "not-owner"
        | "github-error"
        | "already-claimed";
    });

export async function claimProject(projectId: number): Promise<ClaimResult> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to claim a project.");

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");
  if (project.claimedById && project.claimedById !== userId) {
    return {
      ...fail("This project has already been claimed by its maintainer."),
      reason: "already-claimed",
    };
  }

  const result = await verifyRepoOwnership(userId, project.owner, project.repo);
  if (!result.owned) {
    const messages: Record<string, string> = {
      "no-github-connection":
        "Connect your GitHub account first, then try again.",
      "token-revoked":
        "Your GitHub authorization was revoked. Reconnect GitHub and try again.",
      "repo-not-found":
        "GitHub couldn't find this repository with your account's access.",
      "not-owner": result.githubLogin
        ? `Your GitHub account (@${result.githubLogin}) doesn't have admin rights on ${project.owner}/${project.repo}.`
        : "Your GitHub account doesn't have admin rights on this repository.",
      "github-error": "GitHub couldn't be reached. Try again shortly.",
    };
    return { ...fail(messages[result.reason]), reason: result.reason };
  }

  await db
    .update(projects)
    .set({ claimedById: userId, claimedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await db.insert(claims).values({
    projectId,
    userId,
    githubLogin: result.githubLogin,
    method: result.method,
  });

  revalidateProject(project);
  revalidatePath(`${projectPath(project)}/claim`);
  return { ok: true, method: result.method };
}

export async function releaseClaim(
  projectId: number,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");
  if (project.claimedById !== userId) {
    return fail("Only the current claimant can release a claim.");
  }

  await db
    .update(projects)
    .set({ claimedById: null, claimedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  revalidateProject(project);
  return { ok: true };
}

/* ============================== Edit (claimant only) ============================== */

const editSchema = z.object({
  projectId: z.number().int(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  tagline: z.string().trim().max(180).optional(),
  websiteUrl: z
    .string()
    .trim()
    .url("Website must be a valid URL.")
    .max(300)
    .optional()
    .or(z.literal("")),
  categorySlugs: z.array(z.string()).min(1, "Pick at least one category.").max(4),
});

export async function updateProject(
  input: z.infer<typeof editSchema>,
): Promise<{ ok: true; path: string } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const body = editSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid input.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");
  if (project.claimedById !== userId) {
    return fail("Only the verified maintainer can edit this project.");
  }

  const catRows = await db
    .select()
    .from(categories)
    .where(inArray(categories.slug, body.data.categorySlugs));
  if (catRows.length === 0) return fail("Pick at least one category.");

  await db
    .update(projects)
    .set({
      name: body.data.name,
      tagline: body.data.tagline || null,
      websiteUrl: body.data.websiteUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id));
  await db
    .delete(projectCategories)
    .where(eq(projectCategories.projectId, project.id));
  await db.insert(projectCategories).values(
    catRows.map((c) => ({ projectId: project.id, categoryId: c.id })),
  );

  revalidateProject(project);
  return { ok: true, path: projectPath(project) };
}
