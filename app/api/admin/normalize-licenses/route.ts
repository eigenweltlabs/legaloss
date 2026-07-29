import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectStats } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { normalizeSpdx } from "@/lib/license";

/**
 * Rewrites stored SPDX ids to their canonical spelling. GitHub supplied them
 * upper-cased and Hugging Face lower-cased, so the index accumulated "MIT"
 * beside "mit" — one license, two rows in every dropdown built from the column.
 *
 * Browse filters by obligation group and compares lower-cased, so this is not
 * what makes the filter correct; it is what makes the id shown on a project
 * page consistent, and what stops the raw data drifting further. Idempotent —
 * safe to re-run, and worth re-running after a bulk index.
 *
 * POST with "Authorization: Bearer $ADMIN_API_TOKEN". Add {"dryRun": true} to
 * see what would change without writing.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let dryRun = false;
  try {
    const body = await request.json();
    dryRun = Boolean((body as { dryRun?: unknown } | null)?.dryRun);
  } catch {
    // No body is the normal case: apply the rewrite.
  }

  const rows = await db
    .select({ projectId: projectStats.projectId, spdx: projectStats.licenseSpdx })
    .from(projectStats);

  const changes: { projectId: number; from: string; to: string | null }[] = [];
  for (const row of rows) {
    if (row.spdx === null) continue;
    const next = normalizeSpdx(row.spdx);
    if (next !== row.spdx) changes.push({ projectId: row.projectId, from: row.spdx, to: next });
  }

  if (!dryRun) {
    for (const change of changes) {
      await db
        .update(projectStats)
        .set({ licenseSpdx: change.to })
        .where(eq(projectStats.projectId, change.projectId));
    }
    revalidatePath("/");
  }

  return NextResponse.json({
    dryRun,
    scanned: rows.length,
    changed: changes.length,
    changes,
  });
}
