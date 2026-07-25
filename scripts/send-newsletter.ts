/*
 * Sends the featured-projects newsletter from THIS machine's database. For
 * production sends prefer the admin route, which reads prod data directly:
 *
 *   curl -X POST https://legal-oss.com/api/admin/newsletter \
 *     -H "Authorization: Bearer $ADMIN_API_TOKEN" \
 *     -H "Content-Type: application/json" -d '{"dryRun": true}'   # then {}
 *
 * Local usage:
 *   BREVO_API_KEY=… BREVO_LIST_ID=… pnpm newsletter:send            # send
 *   pnpm newsletter:send --dry-run                                  # preview
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { buildIssue, sendCampaign, type IssueProject } from "../lib/newsletter";
import * as schema from "../lib/db/schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://legal-oss.com";
const DRY_RUN = process.argv.includes("--dry-run");
const apiKey = process.env.BREVO_API_KEY;
const listId = Number(process.env.BREVO_LIST_ID);
if (!DRY_RUN && (!apiKey || !Number.isInteger(listId) || listId <= 0)) {
  console.error("Set BREVO_API_KEY and BREVO_LIST_ID first (or use --dry-run).");
  process.exit(1);
}

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function main() {
  const rows = await db
    .select({
      id: schema.projects.id,
      source: schema.projects.source,
      sourceType: schema.projects.sourceType,
      owner: schema.projects.owner,
      repo: schema.projects.repo,
      name: schema.projects.name,
      tagline: schema.projects.tagline,
      description: schema.projectStats.description,
      stars: schema.projectStats.stars,
      language: schema.projectStats.language,
    })
    .from(schema.projects)
    .leftJoin(
      schema.projectStats,
      eq(schema.projectStats.projectId, schema.projects.id),
    )
    .where(
      and(
        eq(schema.projects.featured, true),
        isNull(schema.projects.featuredAnnouncedAt),
      ),
    );

  if (rows.length === 0) {
    console.log("No unannounced featured projects; nothing to send.");
    return;
  }

  const items: IssueProject[] = rows.map((r) => ({ ...r, stars: r.stars ?? 0 }));
  const issue = buildIssue(items, SITE_URL);
  console.log(`Issue: "${issue.subject}" (${items.length} project${items.length !== 1 ? "s" : ""})`);

  if (DRY_RUN) {
    console.log(issue.html);
    console.log("\nDry run: nothing sent, nothing stamped.");
    return;
  }

  const result = await sendCampaign({
    apiKey: apiKey!,
    listId,
    subject: issue.subject,
    html: issue.html,
  });
  if ("error" in result) {
    console.error(result.error);
    process.exit(1);
  }

  const now = new Date();
  for (const row of rows) {
    await db
      .update(schema.projects)
      .set({ featuredAnnouncedAt: now })
      .where(eq(schema.projects.id, row.id));
  }
  console.log(`Sent campaign ${result.campaignId} and stamped ${rows.length} project(s).`);
}

main().then(() => sqlite.close());
