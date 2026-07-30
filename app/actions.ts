"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  categories,
  claims,
  comments,
  projectCategories,
  projectMaintainers,
  projectReadmes,
  projects,
  projectStats,
  reviews,
  stars,
  users,
} from "@/lib/db/schema";
import { isAdminUser } from "@/lib/admin";
import { autoCategorize } from "@/lib/auto-categories";
import { canEditProject, normalizeGithubLogin } from "@/lib/maintainers";
import { CLAIM_FILE_NAME, claimToken, verifyClaimFile } from "@/lib/claim-file";
import { verifyRepoOwnership } from "@/lib/github-ownership";
import { sanitizeNote } from "@/lib/note-sanitize";
import { verifyHfOwnership } from "@/lib/huggingface-ownership";
import { detectSource, resolveRepo } from "@/lib/index-repo";
import { projectHref } from "@/lib/sources";
import { ensureCurrentUser, mirrorClerkUser } from "@/lib/users";

type ActionError = { ok: false; error: string };

type SourceShape = {
  source: string;
  sourceType: string | null;
  owner: string;
  repo: string;
};

function fail(error: string): ActionError {
  return { ok: false, error };
}

function revalidateProject(p: SourceShape | { owner: string; repo: string }) {
  const shape: SourceShape =
    "source" in p ? p : { source: "github", sourceType: null, owner: p.owner, repo: p.repo };
  revalidatePath(projectHref(shape));
  revalidatePath("/projects");
  revalidatePath("/");
  // Starring is the one mutation that changes membership of a personal list.
  revalidatePath("/my-projects");
}

async function getProjectById(id: number) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

/* ============================== Submit ============================== */

export type RepoPreview = {
  ok: true;
  source: "github" | "huggingface";
  sourceType: string | null;
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  /** GitHub stars or Hugging Face likes. */
  stars: number;
  /** Hugging Face downloads (0 for GitHub). */
  downloads: number;
  language: string | null;
  licenseSpdx: string | null;
  topics: string[];
  archived: boolean;
};

async function findExistingPath(key: string): Promise<string | undefined> {
  const rows = await db
    .select({ source: projects.source, sourceType: projects.sourceType, owner: projects.owner, repo: projects.repo })
    .from(projects)
    .where(eq(projects.fullNameKey, key))
    .limit(1);
  return rows[0] ? projectHref(rows[0]) : undefined;
}

export async function previewRepo(
  input: string,
): Promise<RepoPreview | (ActionError & { existingPath?: string })> {
  const detected = detectSource(input);
  if (!detected) {
    return fail(
      "That doesn't look like a repository. Paste a github.com/owner/repo or huggingface.co/owner/name URL.",
    );
  }

  const resolved = await resolveRepo(detected);
  if ("error" in resolved) return fail(resolved.error);
  const d = resolved.data;

  const existingPath = await findExistingPath(d.key);
  if (existingPath) {
    return { ...fail(`${d.fullName} is already in the index.`), existingPath };
  }

  return {
    ok: true,
    source: d.source,
    sourceType: d.sourceType,
    owner: d.owner,
    repo: d.repo,
    fullName: d.fullName,
    description: d.description,
    stars: d.stats.stars ?? 0,
    downloads: d.stats.downloads ?? 0,
    language: d.stats.language ?? null,
    licenseSpdx: d.stats.licenseSpdx ?? null,
    topics: d.topics,
    archived: d.stats.archived ?? false,
  };
}

const submitSchema = z.object({
  url: z.string().min(1),
  websiteUrl: z
    .string()
    .trim()
    .url("Website must be a valid URL.")
    .max(300)
    .optional()
    .or(z.literal("")),
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

  const detected = detectSource(body.data.url);
  if (!detected) return fail("Invalid repository URL.");

  // Normalize both sources to the columns projects/projectStats need. Fetched
  // server-side; the client's preview is never trusted.
  const resolved = await resolveRepo(detected);
  if ("error" in resolved) return fail(resolved.error);
  const fields = resolved.data;

  // Tagline and categories are maintainer-curated after claiming; submissions
  // only get a provisional auto-categorization from topics/description.
  const provisionalSlugs = autoCategorize(fields.topics, fields.description, fields.repo);
  const catRows = provisionalSlugs.length
    ? await db.select().from(categories).where(inArray(categories.slug, provisionalSlugs))
    : [];

  let projectId: number;
  try {
    const inserted = await db
      .insert(projects)
      .values({
        source: fields.source,
        sourceType: fields.sourceType,
        owner: fields.owner,
        repo: fields.repo,
        fullNameKey: fields.key,
        name: fields.repo,
        websiteUrl: body.data.websiteUrl || null,
        submittedById: userId,
      })
      .returning({ id: projects.id });
    projectId = inserted[0].id;
  } catch {
    // Unique-constraint race: someone indexed it between preview and submit.
    return {
      ...fail(`${fields.fullName} is already in the index.`),
      existingPath: await findExistingPath(fields.key),
    };
  }

  await db.insert(projectStats).values({
    projectId,
    ...fields.stats,
    fetchedAt: new Date(),
  });
  if (catRows.length > 0) {
    await db.insert(projectCategories).values(
      catRows.map((c) => ({ projectId, categoryId: c.id })),
    );
  }

  const shape = {
    source: fields.source,
    sourceType: fields.sourceType,
    owner: fields.owner,
    repo: fields.repo,
  };
  revalidateProject(shape);
  return { ok: true, path: projectHref(shape) };
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

  revalidatePath(projectHref(project));
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
  if (project) revalidatePath(projectHref(project));
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
        | "no-hf-connection"
        | "hf-error"
        | "already-claimed"
        | "file-not-found"
        | "file-mismatch"
        | "fetch-error";
    });

type ClaimSubject = Awaited<ReturnType<typeof getProjectById>>;

/** Record a verified claim: current claimant on the project, plus an audit row. */
async function commitClaim(
  project: NonNullable<ClaimSubject>,
  userId: string,
  login: string,
  method: string,
) {
  await db
    .update(projects)
    .set({ claimedById: userId, claimedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, project.id));
  await db.insert(claims).values({
    projectId: project.id,
    userId,
    githubLogin: login,
    method,
  });

  revalidateProject(project);
  revalidatePath(`${projectHref(project)}/claim`);
}

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

  let login: string;
  let method: string;
  if (project.source === "huggingface") {
    const result = await verifyHfOwnership(userId, project.owner);
    if (!result.owned) {
      const messages: Record<string, string> = {
        "no-hf-connection": "Connect your Hugging Face account first, then try again.",
        "token-revoked":
          "Your Hugging Face authorization was revoked. Reconnect and try again.",
        "not-owner": result.hfUsername
          ? `Your Hugging Face account (@${result.hfUsername}) doesn't own ${project.owner}/${project.repo}.`
          : `Your Hugging Face account doesn't own ${project.owner}/${project.repo}.`,
        "hf-error": "Hugging Face couldn't be reached. Try again shortly.",
      };
      return { ...fail(messages[result.reason]), reason: result.reason };
    }
    login = result.hfUsername;
    method = `hf-${result.method}`;
  } else {
    const result = await verifyRepoOwnership(userId, project.owner, project.repo);
    if (!result.owned) {
      const messages: Record<string, string> = {
        "no-github-connection": "Connect your GitHub account first, then try again.",
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
    login = result.githubLogin;
    method = result.method;
  }

  await commitClaim(project, userId, login, method);
  return { ok: true, method };
}

/**
 * Scope-free alternative to the OAuth claim: the maintainer publishes their
 * personal token in the repository, we read it back anonymously. Neither
 * source exposes organization membership without also granting repository
 * read access, so maintainers who decline that still have a way in.
 */
export async function claimProjectByFile(projectId: number): Promise<ClaimResult> {
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

  const result = await verifyClaimFile(project, claimToken(projectId, userId));
  if (!result.verified) {
    const messages: Record<typeof result.reason, string> = {
      "file-not-found": `No ${CLAIM_FILE_NAME} found in ${project.owner}/${project.repo}. Commit it to the default branch (or paste the token into the README) and try again.`,
      "file-mismatch": `${CLAIM_FILE_NAME} exists but doesn't contain your token. Check you copied the whole line — tokens are per person, so someone else's won't verify.`,
      "fetch-error": `${project.source === "huggingface" ? "Hugging Face" : "GitHub"} couldn't be reached. Try again shortly.`,
    };
    return { ...fail(messages[result.reason]), reason: result.reason };
  }

  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await commitClaim(project, userId, rows[0]?.username ?? userId, "file-verification");
  return { ok: true, method: "file-verification" };
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
  // Grants belong to the claimant; they don't outlive the claim.
  await db
    .delete(projectMaintainers)
    .where(eq(projectMaintainers.projectId, projectId));

  revalidateProject(project);
  return { ok: true };
}

/* ============================== Additional maintainers (claimant only) ============================== */

const maintainerSchema = z.object({
  projectId: z.number().int(),
  githubLogin: z.string().trim().min(1, "Enter a GitHub username.").max(300),
});

/**
 * Grant maintainer rights to another GitHub account. The grant is keyed on the
 * login alone: whenever a member with that GitHub account connected signs in,
 * they can edit this project as if they had claimed it themselves.
 */
export async function addProjectMaintainer(
  input: z.infer<typeof maintainerSchema>,
): Promise<{ ok: true; githubLogin: string } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const body = maintainerSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid input.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");
  if (project.claimedById !== userId) {
    return fail("Only the claimant can add maintainers.");
  }

  const login = normalizeGithubLogin(body.data.githubLogin);
  if (!login) {
    return fail("That doesn't look like a GitHub username.");
  }

  await db
    .insert(projectMaintainers)
    .values({ projectId: project.id, githubLogin: login, addedById: userId })
    .onConflictDoNothing();

  revalidateProject(project);
  revalidatePath(`${projectHref(project)}/edit`);
  return { ok: true, githubLogin: login };
}

export async function removeProjectMaintainer(
  input: z.infer<typeof maintainerSchema>,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const body = maintainerSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid input.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");
  if (project.claimedById !== userId) {
    return fail("Only the claimant can remove maintainers.");
  }

  const login = normalizeGithubLogin(body.data.githubLogin);
  if (!login) return fail("That doesn't look like a GitHub username.");

  await db
    .delete(projectMaintainers)
    .where(
      and(
        eq(projectMaintainers.projectId, project.id),
        eq(projectMaintainers.githubLogin, login),
      ),
    );

  revalidateProject(project);
  revalidatePath(`${projectHref(project)}/edit`);
  return { ok: true };
}

/* ============================== Claims (admin only) ============================== */

/**
 * Hand-granted claim, for maintainers who proved control out of band. The UI
 * twin of POST /api/admin/claims — same audit method, same refusal to take a
 * project off an existing claimant without an explicit reassign.
 */
export async function adminGrantClaim(input: {
  projectId: number;
  clerkUserId: string;
  reassign?: boolean;
}): Promise<{ ok: true; claimant: string; reassigned: boolean } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId || !isAdminUser(userId)) {
    return fail("Only site admins can grant claims.");
  }

  const project = await getProjectById(input.projectId);
  if (!project) return fail("Project not found.");

  const target = await mirrorClerkUser(input.clerkUserId);
  if (!target) return fail("That account no longer exists in Clerk.");

  if (project.claimedById === target.id) {
    return { ok: true, claimant: target.label, reassigned: false };
  }
  if (project.claimedById && !input.reassign) {
    return fail(
      "This project already has a claimant. Tick “reassign” to take it over.",
    );
  }

  const reassigned = project.claimedById !== null;
  await commitClaim(project, target.id, target.label, "admin-grant");
  revalidatePath("/admin/claims");
  return { ok: true, claimant: target.label, reassigned };
}

/** Release someone else's claim; the claimant's own undo is releaseClaim. */
export async function adminReleaseClaim(
  projectId: number,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId || !isAdminUser(userId)) {
    return fail("Only site admins can release someone else's claim.");
  }

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");
  if (!project.claimedById) return fail("That project isn't claimed.");

  await db
    .update(projects)
    .set({ claimedById: null, claimedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  // Grants belong to the claimant; they don't outlive the claim.
  await db
    .delete(projectMaintainers)
    .where(eq(projectMaintainers.projectId, projectId));

  revalidateProject(project);
  revalidatePath(`${projectHref(project)}/claim`);
  revalidatePath("/admin/claims");
  return { ok: true };
}

/* ============================== README override (claimant only) ============================== */

/**
 * Server-side allowlist for the maintainer-edited README. Whatever the editor
 * sends, only this survives — scripts, styles, and event handlers never reach
 * the database.
 */
const README_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "details",
    "summary",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name"],
    img: ["src", "alt", "width", "height"],
    "*": ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer", target: "_blank" }),
  },
};

const readmeSchema = z.object({
  projectId: z.number().int(),
  html: z.string().max(300_000, "That README is too large."),
});

export async function updateProjectReadme(
  input: z.infer<typeof readmeSchema>,
): Promise<{ ok: true; cleared: boolean } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const body = readmeSchema.safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid input.");

  const project = await getProjectById(body.data.projectId);
  if (!project) return fail("Project not found.");
  if (!(await canEditProject(project, userId))) {
    return fail("Only the verified maintainer can edit the README.");
  }

  const clean = sanitizeHtml(body.data.html, README_SANITIZE).trim();
  // An effectively empty document clears the override back to the GitHub README.
  const isEmpty = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim() === "";
  const customHtml = isEmpty ? null : clean;

  await db
    .insert(projectReadmes)
    .values({
      projectId: project.id,
      html: null,
      customHtml,
      customUpdatedAt: customHtml ? new Date() : null,
      fetchedAt: new Date(0), // marks the GitHub cache stale so it refreshes on view
    })
    .onConflictDoUpdate({
      target: projectReadmes.projectId,
      set: { customHtml, customUpdatedAt: customHtml ? new Date() : null },
    });

  revalidateProject(project);
  return { ok: true, cleared: isEmpty };
}

export async function resetProjectReadme(
  projectId: number,
): Promise<{ ok: true } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in first.");

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");
  if (!(await canEditProject(project, userId))) {
    return fail("Only the verified maintainer can edit the README.");
  }

  await db
    .update(projectReadmes)
    .set({ customHtml: null, customUpdatedAt: null })
    .where(eq(projectReadmes.projectId, project.id));

  revalidateProject(project);
  return { ok: true };
}

/* ============================== Featured (admin only) ============================== */

export async function toggleFeatured(
  projectId: number,
): Promise<{ ok: true; featured: boolean } | ActionError> {
  const userId = await ensureCurrentUser();
  if (!userId || !isAdminUser(userId)) {
    return fail("Only site admins can feature projects.");
  }

  const project = await getProjectById(projectId);
  if (!project) return fail("Project not found.");

  const featured = !project.featured;
  await db
    .update(projects)
    .set({
      featured,
      featuredAt: featured ? new Date() : null,
      // Unfeaturing resets the announcement, so featuring again later lands
      // the project in the next newsletter issue.
      featuredAnnouncedAt: featured ? undefined : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  revalidateProject(project);
  return { ok: true, featured };
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
  // Rich HTML from the note editor; sanitized below. The cap leaves markup
  // overhead on top of the old 4,000-character plain-text limit.
  maintainerNote: z.string().trim().max(10_000).optional(),
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
  if (!(await canEditProject(project, userId))) {
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
      maintainerNote: body.data.maintainerNote
        ? sanitizeNote(body.data.maintainerNote)
        : null,
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
  return { ok: true, path: projectHref(project) };
}
