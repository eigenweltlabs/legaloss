/*
 * Sends the featured-projects newsletter: every featured project that hasn't
 * been announced yet goes out as one Brevo campaign to the LegalOSS list, then
 * gets stamped so the next issue only carries genuinely new picks.
 *
 *   BREVO_API_KEY=… BREVO_LIST_ID=… pnpm newsletter:send            # send
 *   BREVO_API_KEY=… BREVO_LIST_ID=… pnpm newsletter:send --dry-run  # preview
 *
 * Runs against DATABASE_PATH (defaults to ./data/app.db), so point it at the
 * production database when sending for real.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";

const API = "https://api.brevo.com/v3";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://legal-oss.com";
const SENDER = { name: "LegalOSS · Eigenwelt Labs", email: "hello@eigenweltlabs.com" };

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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function projectBlock(p: {
  owner: string;
  repo: string;
  name: string;
  tagline: string | null;
  description: string | null;
  stars: number;
  language: string | null;
}): string {
  const url = `${SITE_URL}/projects/${p.owner}/${p.repo}`;
  const desc = p.tagline ?? p.description ?? "";
  const meta = [`★ ${p.stars.toLocaleString("en-US")}`, p.language]
    .filter(Boolean)
    .join(" · ");
  return `
    <tr><td style="padding:0 0 28px 0;">
      <a href="${url}" style="font-family:Georgia,serif;font-size:20px;color:#241811;text-decoration:none;font-weight:bold;">${esc(p.name)}</a>
      <div style="font-family:monospace;font-size:12px;color:#78685A;padding:2px 0 6px 0;">${esc(`${p.owner}/${p.repo}`)} · ${esc(meta)}</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#4A3A2B;">${esc(desc)}</div>
      <div style="padding-top:8px;"><a href="${url}" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#C2371F;">View on LegalOSS →</a></div>
    </td></tr>`;
}

function issueHtml(blocks: string[]): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F6F0;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="padding:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C2371F;">LegalOSS</td></tr>
    <tr><td style="padding:0 0 24px 0;font-family:Georgia,serif;font-size:26px;color:#171008;">Newly featured open-source legal software</td></tr>
    <tr><td style="padding:0 0 28px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#4A3A2B;">Hand-picked from the index. Every entry is a real repository with live GitHub stats, and each page can be claimed by its maintainer.</td></tr>
    ${blocks.join("\n")}
    <tr><td style="border-top:1px solid rgba(36,24,17,0.14);padding:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#78685A;">
      You subscribed at <a href="${SITE_URL}" style="color:#78685A;">legal-oss.com</a> · Built in Berlin by <a href="https://eigenweltlabs.com" style="color:#78685A;">Eigenwelt Labs</a> · <a href="{{ unsubscribe }}" style="color:#78685A;">Unsubscribe</a>
    </td></tr>
  </table>
  </td></tr></table></body></html>`;
}

async function main() {
  const rows = await db
    .select({
      id: schema.projects.id,
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

  const items = rows.map((r) => ({ ...r, stars: r.stars ?? 0 }));
  const names = items.map((p) => p.name);
  const subject =
    items.length === 1
      ? `Featured on LegalOSS: ${names[0]}`
      : `Featured on LegalOSS: ${names.slice(0, 2).join(", ")}${items.length > 2 ? ` + ${items.length - 2} more` : ""}`;
  const html = issueHtml(items.map(projectBlock));

  console.log(`Issue: "${subject}" (${items.length} project${items.length !== 1 ? "s" : ""})`);
  if (DRY_RUN) {
    console.log(html);
    console.log("\nDry run: nothing sent, nothing stamped.");
    return;
  }

  const headers = {
    "api-key": apiKey!,
    "content-type": "application/json",
    accept: "application/json",
  };
  const createRes = await fetch(`${API}/emailCampaigns`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `LegalOSS featured · ${new Date().toISOString().slice(0, 10)}`,
      subject,
      sender: SENDER,
      type: "classic",
      htmlContent: html,
      recipients: { listIds: [listId] },
    }),
  });
  if (!createRes.ok) {
    console.error(`Brevo ${createRes.status} creating campaign:`, await createRes.text());
    process.exit(1);
  }
  const campaign = (await createRes.json()) as { id: number };

  const sendRes = await fetch(`${API}/emailCampaigns/${campaign.id}/sendNow`, {
    method: "POST",
    headers,
  });
  if (!sendRes.ok) {
    console.error(
      `Brevo ${sendRes.status} sending campaign ${campaign.id}:`,
      await sendRes.text(),
    );
    console.error("Campaign was created but NOT sent; review it in the Brevo dashboard.");
    process.exit(1);
  }

  const now = new Date();
  for (const p of items) {
    await db
      .update(schema.projects)
      .set({ featuredAnnouncedAt: now })
      .where(eq(schema.projects.id, p.id));
  }
  console.log(`Sent campaign ${campaign.id} and stamped ${items.length} project(s).`);
}

main().then(() => sqlite.close());
