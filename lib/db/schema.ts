import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/** Mirror of the Clerk user, upserted lazily on first authenticated write. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  username: text("username"),
  name: text("name"),
  imageUrl: text("image_url"),
  githubLogin: text("github_login"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Canonical owner/repo as returned by the GitHub API. */
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    /** lower(owner/repo) — GitHub names are case-insensitive, so uniqueness lives here. */
    fullNameKey: text("full_name_key").notNull(),
    name: text("name").notNull(),
    /** Short editorial description; editable by the claimant only. */
    tagline: text("tagline"),
    websiteUrl: text("website_url"),
    submittedById: text("submitted_by_id").references(() => users.id),
    claimedById: text("claimed_by_id").references(() => users.id),
    claimedAt: integer("claimed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("projects_full_name_key_unique").on(t.fullNameKey),
    index("projects_claimed_by_idx").on(t.claimedById),
  ],
);

/** Cached GitHub repository stats, refreshed when stale. 1:1 with projects. */
export const projectStats = sqliteTable("project_stats", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  subscribers: integer("subscribers").notNull().default(0),
  language: text("language"),
  licenseSpdx: text("license_spdx"),
  licenseName: text("license_name"),
  topics: text("topics", { mode: "json" }).$type<string[]>().notNull().default([]),
  description: text("description"),
  homepage: text("homepage"),
  defaultBranch: text("default_branch"),
  pushedAt: integer("pushed_at", { mode: "timestamp" }),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Cached README rendered to HTML by GitHub. Kept apart from stats to keep list queries light. */
export const projectReadmes = sqliteTable("project_readmes", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  html: text("html"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Contributor = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
};

/** Cached GitHub contributor list (top page, bots excluded). 1:1 with projects. */
export const projectContributors = sqliteTable("project_contributors", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  data: text("data", { mode: "json" }).$type<Contributor[]>().notNull().default([]),
  /** Total contributor count is unknown past the first page; this flags "100+". */
  hasMore: integer("has_more", { mode: "boolean" }).notNull().default(false),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb"),
  sort: integer("sort").notNull().default(0),
});

export const projectCategories = sqliteTable(
  "project_categories",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.categoryId] })],
);

/** Site-level stars ("endorsements"), independent of GitHub stargazers. */
export const stars = sqliteTable(
  "stars",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("comments_project_idx").on(t.projectId)],
);

/** One structured review per user per project: 1–5 rating plus text. */
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("reviews_project_user_unique").on(t.projectId, t.userId),
    index("reviews_project_idx").on(t.projectId),
  ],
);

/** Audit log of successful ownership claims. Current claimant lives on projects.claimedById. */
export const claims = sqliteTable(
  "claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    githubLogin: text("github_login").notNull(),
    /** "owner-match" (repo owner is the user) or "admin-permission" (org repo, admin rights). */
    method: text("method").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("claims_project_idx").on(t.projectId)],
);
