import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projects, projectStats } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/site";
import { projectHref } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** DB-driven sitemap: every project page plus the browsing surfaces. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectRows, categoryRows] = await Promise.all([
    db
      .select({
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
        updatedAt: projects.updatedAt,
        pushedAt: projectStats.pushedAt,
      })
      .from(projects)
      .leftJoin(projectStats, eq(projectStats.projectId, projects.id)),
    db.select({ slug: categories.slug }).from(categories),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categoryRows.map((c) => ({
    url: `${SITE_URL}/?category=${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const projectEntries: MetadataRoute.Sitemap = projectRows.map((p) => ({
    url: `${SITE_URL}${projectHref(p)}`,
    lastModified: p.pushedAt ?? p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...projectEntries];
}
