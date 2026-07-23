import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { CATEGORY_SEED } from "./seed-categories";
import { STARTER_PROJECTS } from "./starter-projects";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __legalossDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });

  // Fresh database (first boot in prod, or wiped local dev): apply the
  // checked-in migrations and seed baseline content.
  const initialized = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  if (!initialized) {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(database, { migrationsFolder });
    }
  }
  // Idempotent on every boot: category upserts are no-ops once present, and
  // the starter seed exits early unless the index is empty (so a rate-limited
  // first boot retries on the next cold start).
  bootstrapSeed(database);
  return database;
}

type Db = ReturnType<typeof createDb>;

function bootstrapSeed(database: Db) {
  for (const [i, c] of CATEGORY_SEED.entries()) {
    database
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, blurb: c.blurb, sort: i })
      .onConflictDoNothing()
      .run();
  }
  if (process.env.SEED_STARTERS === "1") {
    // Fire-and-forget: pulls real repos from the GitHub API on first boot.
    void seedStarters(database).catch((err) =>
      console.error("starter seed failed:", err),
    );
  }
}

async function seedStarters(database: Db) {
  const existing = database.select().from(schema.projects).limit(1).all();
  if (existing.length > 0) return;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "legaloss",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  for (const starter of STARTER_PROJECTS) {
    const res = await fetch(`https://api.github.com/repos/${starter.repo}`, {
      headers,
    });
    if (!res.ok) {
      console.error(`starter seed: GitHub ${res.status} for ${starter.repo}`);
      continue;
    }
    const d = await res.json();
    const key = String(d.full_name).toLowerCase();
    try {
      const inserted = database
        .insert(schema.projects)
        .values({
          owner: d.owner.login,
          repo: d.name,
          fullNameKey: key,
          name: d.name,
        })
        .onConflictDoNothing()
        .returning({ id: schema.projects.id })
        .all();
      const projectId = inserted[0]?.id;
      if (!projectId) continue;

      database
        .insert(schema.projectStats)
        .values({
          projectId,
          stars: d.stargazers_count ?? 0,
          forks: d.forks_count ?? 0,
          openIssues: d.open_issues_count ?? 0,
          subscribers: d.subscribers_count ?? 0,
          language: d.language ?? null,
          licenseSpdx:
            d.license?.spdx_id && d.license.spdx_id !== "NOASSERTION"
              ? d.license.spdx_id
              : null,
          licenseName: d.license?.name ?? null,
          topics: Array.isArray(d.topics) ? d.topics : [],
          description: d.description ?? null,
          homepage: d.homepage || null,
          defaultBranch: d.default_branch ?? "main",
          pushedAt: d.pushed_at ? new Date(d.pushed_at) : null,
          archived: Boolean(d.archived),
          fetchedAt: new Date(),
        })
        .run();

      const cats = database
        .select()
        .from(schema.categories)
        .all()
        .filter((c) => starter.categories.includes(c.slug));
      for (const c of cats) {
        database
          .insert(schema.projectCategories)
          .values({ projectId, categoryId: c.id })
          .onConflictDoNothing()
          .run();
      }
      console.log(`starter seed: indexed ${d.full_name}`);
    } catch (err) {
      console.error(`starter seed: failed for ${starter.repo}:`, err);
    }
  }
}

// Reuse the connection across dev hot reloads.
export const db = globalThis.__legalossDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__legalossDb = db;

export * as tables from "./schema";
