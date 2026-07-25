import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  categories,
  projectCategories,
  projects,
  projectStats,
} from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { autoCategorize } from "@/lib/auto-categories";
import { hfKey } from "@/lib/huggingface";
import { detectSource, resolveRepo } from "@/lib/index-repo";

/**
 * Token-gated bulk indexing for site admins — the runtime replacement for the
 * old backfill script, so the curated launch list never has to live in the
 * repo. POST { repos: [{ repo: "owner/name", categories?, tagline? }] } with
 * "Authorization: Bearer $ADMIN_API_TOKEN". Idempotent: already-indexed repos
 * come back as "exists". Requires ADMIN_API_TOKEN; without it the endpoint
 * always rejects.
 */

const MAX_CATEGORIES = 4;
const FETCH_DELAY_MS = 150;

const bodySchema = z.object({
  repos: z
    .array(
      z.object({
        repo: z.string().min(1),
        categories: z.array(z.string()).max(MAX_CATEGORIES).default([]),
        tagline: z.string().trim().max(180).optional(),
      }),
    )
    .min(1)
    .max(200),
});

type RepoResult = {
  repo: string;
  status: "indexed" | "exists" | "error";
  message?: string;
};

const deleteSchema = z.object({
  repos: z.array(z.string().min(1)).min(1).max(200),
});

async function alreadyIndexed(fullNameKey: string): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.fullNameKey, fullNameKey))
    .limit(1);
  return Boolean(rows[0]);
}

/** Remove entries from the index; child rows (stats, categories, stars, …) cascade. */
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

  const results: { repo: string; status: "removed" | "missing" | "error" }[] = [];
  for (const repo of body.data.repos) {
    const detected = detectSource(repo);
    if (!detected) {
      results.push({ repo, status: "error" });
      continue;
    }
    const key =
      detected.source === "huggingface"
        ? hfKey(detected.type, detected.owner, detected.repo)
        : `${detected.owner}/${detected.repo}`.toLowerCase();
    const removed = await db
      .delete(projects)
      .where(eq(projects.fullNameKey, key))
      .returning({ id: projects.id });
    results.push({ repo, status: removed.length > 0 ? "removed" : "missing" });
  }

  revalidatePath("/");
  revalidatePath("/projects");
  return NextResponse.json({
    results,
    removed: results.filter((r) => r.status === "removed").length,
  });
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
  const body = bodySchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const results: RepoResult[] = [];
  let fetched = false;

  for (const entry of body.data.repos) {
    const detected = detectSource(entry.repo);
    if (!detected) {
      results.push({
        repo: entry.repo,
        status: "error",
        message: "Not a valid GitHub or Hugging Face repository reference.",
      });
      continue;
    }

    // Fast path: skip the API call when already indexed under this name.
    const preKey =
      detected.source === "huggingface"
        ? hfKey(detected.type, detected.owner, detected.repo)
        : `${detected.owner}/${detected.repo}`.toLowerCase();
    if (await alreadyIndexed(preKey)) {
      results.push({ repo: entry.repo, status: "exists" });
      continue;
    }

    if (fetched) {
      await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
    }
    fetched = true;
    const resolved = await resolveRepo(detected);
    if ("error" in resolved) {
      results.push({ repo: entry.repo, status: "error", message: resolved.error });
      continue;
    }
    const d = resolved.data;

    // The API follows renames, so re-check under the canonical name.
    if (await alreadyIndexed(d.key)) {
      results.push({ repo: entry.repo, status: "exists" });
      continue;
    }

    const slugs = [
      ...entry.categories,
      ...autoCategorize(d.topics, d.description, d.repo),
    ]
      .filter((slug, i, all) => all.indexOf(slug) === i)
      .slice(0, MAX_CATEGORIES);
    const catRows = slugs.length
      ? await db.select().from(categories).where(inArray(categories.slug, slugs))
      : [];

    let projectId: number;
    try {
      const inserted = await db
        .insert(projects)
        .values({
          source: d.source,
          sourceType: d.sourceType,
          owner: d.owner,
          repo: d.repo,
          fullNameKey: d.key,
          name: d.repo,
          tagline: entry.tagline ?? null,
        })
        .returning({ id: projects.id });
      projectId = inserted[0].id;
    } catch {
      // Unique-constraint race: someone indexed it during this request.
      results.push({ repo: entry.repo, status: "exists" });
      continue;
    }

    await db.insert(projectStats).values({
      projectId,
      ...d.stats,
      fetchedAt: new Date(),
    });
    if (catRows.length > 0) {
      await db.insert(projectCategories).values(
        catRows.map((c) => ({ projectId, categoryId: c.id })),
      );
    }

    results.push({ repo: entry.repo, status: "indexed" });
  }

  revalidatePath("/");
  revalidatePath("/projects");

  const count = (status: RepoResult["status"]) =>
    results.filter((r) => r.status === status).length;
  return NextResponse.json({
    results,
    indexed: count("indexed"),
    exists: count("exists"),
    errors: count("error"),
  });
}
