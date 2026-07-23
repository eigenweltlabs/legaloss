import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __openLegalIndexDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// Reuse the connection across dev hot reloads.
export const db = globalThis.__openLegalIndexDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__openLegalIndexDb = db;

export * as tables from "./schema";
