import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, projectStats } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { buildIssue, sendCampaign, type IssueProject } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

/**
 * Composes one newsletter issue from every featured-but-unannounced project
 * in THIS deployment's database and sends it as a Brevo campaign, then stamps
 * the projects announced. `{"dryRun": true}` returns the subject/html preview
 * without sending or stamping — so the first call is always safe.
 */
const bodySchema = z.object({ dryRun: z.boolean().default(false) });

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // empty body = real send
  }
  const body = bodySchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rows = await db
    .select({
      id: projects.id,
      owner: projects.owner,
      repo: projects.repo,
      name: projects.name,
      tagline: projects.tagline,
      description: projectStats.description,
      stars: projectStats.stars,
      language: projectStats.language,
    })
    .from(projects)
    .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
    .where(and(eq(projects.featured, true), isNull(projects.featuredAnnouncedAt)));

  if (rows.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "No unannounced featured projects.",
    });
  }

  const items: IssueProject[] = rows.map((r) => ({ ...r, stars: r.stars ?? 0 }));
  const issue = buildIssue(items, SITE_URL);

  if (body.data.dryRun) {
    return NextResponse.json({
      sent: false,
      dryRun: true,
      subject: issue.subject,
      projects: items.map((p) => `${p.owner}/${p.repo}`),
      html: issue.html,
    });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    return NextResponse.json(
      { error: "BREVO_API_KEY / BREVO_LIST_ID are not configured." },
      { status: 500 },
    );
  }

  const result = await sendCampaign({
    apiKey,
    listId,
    subject: issue.subject,
    html: issue.html,
  });
  if ("error" in result) {
    console.error("[newsletter]", result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const now = new Date();
  for (const row of rows) {
    await db
      .update(projects)
      .set({ featuredAnnouncedAt: now })
      .where(eq(projects.id, row.id));
  }

  return NextResponse.json({
    sent: true,
    campaignId: result.campaignId,
    subject: issue.subject,
    projects: items.map((p) => `${p.owner}/${p.repo}`),
  });
}
