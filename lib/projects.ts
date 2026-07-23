import "server-only";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  comments,
  projectCategories,
  projectContributors,
  projectReadmes,
  projects,
  projectStats,
  reviews,
  stars,
  users,
} from "@/lib/db/schema";
import { fetchContributors, fetchOpenIssueCount, fetchReadmeHtml, fetchRepo } from "@/lib/github";

const STATS_TTL_SECONDS = 60 * 60; // 1 hour
const README_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export type ProjectListItem = {
  id: number;
  owner: string;
  repo: string;
  name: string;
  tagline: string | null;
  claimedById: string | null;
  description: string | null;
  language: string | null;
  licenseSpdx: string | null;
  ghStars: number;
  forks: number;
  pushedAt: Date | null;
  archived: boolean;
  siteStars: number;
  starredByUser: boolean;
  reviewCount: number;
  avgRating: number | null;
  categories: { slug: string; name: string }[];
};

export type SortKey = "gh-stars" | "site-stars" | "rating" | "newest" | "active";

export async function listProjects(opts: {
  categorySlug?: string;
  q?: string;
  sort?: SortKey;
  /** When set, each item carries whether this user has starred it. */
  userId?: string | null;
} = {}): Promise<ProjectListItem[]> {
  const { categorySlug, q, sort = "gh-stars", userId = null } = opts;

  const siteStarAgg = db
    .select({
      projectId: stars.projectId,
      n: sql<number>`count(*)`.as("n"),
    })
    .from(stars)
    .groupBy(stars.projectId)
    .as("site_star_agg");

  const reviewAgg = db
    .select({
      projectId: reviews.projectId,
      n: sql<number>`count(*)`.as("rn"),
      avg: sql<number>`avg(${reviews.rating})`.as("ravg"),
    })
    .from(reviews)
    .groupBy(reviews.projectId)
    .as("review_agg");

  const conds = [];
  if (categorySlug) {
    conds.push(
      inArray(
        projects.id,
        db
          .select({ id: projectCategories.projectId })
          .from(projectCategories)
          .innerJoin(categories, eq(projectCategories.categoryId, categories.id))
          .where(eq(categories.slug, categorySlug)),
      ),
    );
  }
  if (q?.trim()) {
    const needle = `%${q.trim().toLowerCase()}%`;
    conds.push(
      or(
        like(sql`lower(${projects.name})`, needle),
        like(projects.fullNameKey, needle),
        like(sql`lower(coalesce(${projects.tagline}, ''))`, needle),
        like(sql`lower(coalesce(${projectStats.description}, ''))`, needle),
      ),
    );
  }

  const orderBy = {
    "gh-stars": [desc(projectStats.stars)],
    "site-stars": [desc(sql`coalesce(${siteStarAgg.n}, 0)`), desc(projectStats.stars)],
    rating: [desc(sql`coalesce(${reviewAgg.avg}, 0)`), desc(sql`coalesce(${reviewAgg.n}, 0)`)],
    newest: [desc(projects.createdAt)],
    active: [desc(projectStats.pushedAt)],
  }[sort];

  const rows = await db
    .select({
      id: projects.id,
      owner: projects.owner,
      repo: projects.repo,
      name: projects.name,
      tagline: projects.tagline,
      claimedById: projects.claimedById,
      description: projectStats.description,
      language: projectStats.language,
      licenseSpdx: projectStats.licenseSpdx,
      ghStars: sql<number>`coalesce(${projectStats.stars}, 0)`,
      forks: sql<number>`coalesce(${projectStats.forks}, 0)`,
      pushedAt: projectStats.pushedAt,
      archived: sql<boolean>`coalesce(${projectStats.archived}, 0)`,
      siteStars: sql<number>`coalesce(${siteStarAgg.n}, 0)`,
      starredByUser: sql<boolean>`exists (select 1 from ${stars} where ${stars.projectId} = ${projects.id} and ${stars.userId} = ${userId ?? ""})`,
      reviewCount: sql<number>`coalesce(${reviewAgg.n}, 0)`,
      avgRating: reviewAgg.avg,
    })
    .from(projects)
    .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
    .leftJoin(siteStarAgg, eq(siteStarAgg.projectId, projects.id))
    .leftJoin(reviewAgg, eq(reviewAgg.projectId, projects.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...orderBy);

  const cats = rows.length
    ? await db
        .select({
          projectId: projectCategories.projectId,
          slug: categories.slug,
          name: categories.name,
        })
        .from(projectCategories)
        .innerJoin(categories, eq(projectCategories.categoryId, categories.id))
        .where(inArray(projectCategories.projectId, rows.map((r) => r.id)))
        .orderBy(asc(categories.sort))
    : [];

  const catsByProject = new Map<number, { slug: string; name: string }[]>();
  for (const c of cats) {
    const list = catsByProject.get(c.projectId) ?? [];
    list.push({ slug: c.slug, name: c.name });
    catsByProject.set(c.projectId, list);
  }

  return rows.map((r) => ({
    ...r,
    archived: Boolean(r.archived),
    starredByUser: Boolean(r.starredByUser),
    categories: catsByProject.get(r.id) ?? [],
  }));
}

export async function getProject(owner: string, repo: string) {
  const key = `${owner}/${repo}`.toLowerCase();
  const row = await db
    .select()
    .from(projects)
    .where(eq(projects.fullNameKey, key))
    .limit(1);
  return row[0] ?? null;
}

/** Refresh cached GitHub stats when stale. Serves stale data on GitHub errors. */
export async function ensureFreshStats(project: {
  id: number;
  owner: string;
  repo: string;
}) {
  const existing = await db
    .select()
    .from(projectStats)
    .where(eq(projectStats.projectId, project.id))
    .limit(1);
  const stat = existing[0] ?? null;
  const age = stat ? (Date.now() - stat.fetchedAt.getTime()) / 1000 : Infinity;
  if (stat && age < STATS_TTL_SECONDS) return stat;

  const result = await fetchRepo(project.owner, project.repo);
  if (result.error) return stat; // keep stale cache; GitHub hiccup or rate limit

  const d = result.data;
  const issueCount = await fetchOpenIssueCount(project.owner, project.repo);
  const values = {
    stars: d.stars,
    forks: d.forks,
    openIssues: issueCount ?? d.openIssues,
    subscribers: d.subscribers,
    language: d.language,
    licenseSpdx: d.licenseSpdx,
    licenseName: d.licenseName,
    topics: d.topics,
    description: d.description,
    homepage: d.homepage,
    defaultBranch: d.defaultBranch,
    pushedAt: d.pushedAt,
    archived: d.archived,
    fetchedAt: new Date(),
  };
  await db
    .insert(projectStats)
    .values({ projectId: project.id, ...values })
    .onConflictDoUpdate({ target: projectStats.projectId, set: values });

  // Canonicalize casing if the repo was renamed/transferred on GitHub.
  if (d.owner !== project.owner || d.repo !== project.repo) {
    await db
      .update(projects)
      .set({
        owner: d.owner,
        repo: d.repo,
        fullNameKey: d.fullName.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
  }

  const fresh = await db
    .select()
    .from(projectStats)
    .where(eq(projectStats.projectId, project.id))
    .limit(1);
  return fresh[0];
}

export async function ensureFreshReadme(project: {
  id: number;
  owner: string;
  repo: string;
}, defaultBranch: string) {
  const existing = await db
    .select()
    .from(projectReadmes)
    .where(eq(projectReadmes.projectId, project.id))
    .limit(1);
  const row = existing[0] ?? null;
  const age = row ? (Date.now() - row.fetchedAt.getTime()) / 1000 : Infinity;
  if (row && age < README_TTL_SECONDS) return row.html;

  const html = await fetchReadmeHtml(project.owner, project.repo, defaultBranch);
  if (html === null && row) return row.html; // keep stale on error

  await db
    .insert(projectReadmes)
    .values({ projectId: project.id, html, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: projectReadmes.projectId,
      set: { html, fetchedAt: new Date() },
    });
  return html;
}

const CONTRIBUTORS_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export async function ensureFreshContributors(project: {
  id: number;
  owner: string;
  repo: string;
}) {
  const existing = await db
    .select()
    .from(projectContributors)
    .where(eq(projectContributors.projectId, project.id))
    .limit(1);
  const row = existing[0] ?? null;
  const age = row ? (Date.now() - row.fetchedAt.getTime()) / 1000 : Infinity;
  if (row && age < CONTRIBUTORS_TTL_SECONDS) return row;

  const result = await fetchContributors(project.owner, project.repo);
  if (!result) return row; // keep stale cache on GitHub errors

  const values = {
    data: result.contributors,
    hasMore: result.hasMore,
    fetchedAt: new Date(),
  };
  await db
    .insert(projectContributors)
    .values({ projectId: project.id, ...values })
    .onConflictDoUpdate({ target: projectContributors.projectId, set: values });
  return { projectId: project.id, ...values };
}

export async function getProjectSocial(projectId: number, userId: string | null) {
  const [commentRows, reviewRows, starCountRow, userStarRow] = await Promise.all([
    db
      .select({
        id: comments.id,
        userId: comments.userId,
        body: comments.body,
        createdAt: comments.createdAt,
        authorName: users.name,
        authorUsername: users.username,
        authorImage: users.imageUrl,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.projectId, projectId))
      .orderBy(desc(comments.createdAt)),
    db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        authorName: users.name,
        authorUsername: users.username,
        authorImage: users.imageUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.userId))
      .where(eq(reviews.projectId, projectId))
      .orderBy(desc(reviews.createdAt)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(stars)
      .where(eq(stars.projectId, projectId)),
    userId
      ? db
          .select()
          .from(stars)
          .where(and(eq(stars.projectId, projectId), eq(stars.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return {
    comments: commentRows,
    reviews: reviewRows,
    starCount: starCountRow[0]?.n ?? 0,
    starredByUser: userStarRow.length > 0,
  };
}
