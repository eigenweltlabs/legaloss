/* Idempotent seed: pushes the category taxonomy. Run with `pnpm db:seed`. */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";
import { CATEGORY_SEED } from "../lib/db/seed-categories";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function main() {
  for (const [i, c] of CATEGORY_SEED.entries()) {
    await db
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, blurb: c.blurb, sort: i })
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: c.name, blurb: c.blurb, sort: i },
      });
  }
  console.log(`Seeded ${CATEGORY_SEED.length} categories.`);
}

main().then(() => sqlite.close());
