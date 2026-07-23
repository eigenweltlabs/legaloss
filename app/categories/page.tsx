import Link from "next/link";
import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories } from "@/lib/db/schema";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const rows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      blurb: categories.blurb,
      count: sql<number>`(select count(*) from ${projectCategories} where ${projectCategories.categoryId} = ${categories.id})`,
    })
    .from(categories)
    .orderBy(categories.sort);

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Categories</span>
        <h1 className="display-m">The shape of legal open source.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Twelve practice-grounded categories, from running a firm to parsing a
          citation. Every project carries one to four.
        </p>
      </div>
      <div className="project-grid">
        {rows.map((c) => (
          <Link
            key={c.slug}
            href={`/?category=${c.slug}`}
            className="card card-hover project-card"
            style={{ minHeight: 150 }}
          >
            <div className="pc-top">
              <div className="pc-name">{c.name}</div>
              <IconArrowRight style={{ width: 16, height: 16, color: "var(--ink-500)", flexShrink: 0 }} />
            </div>
            <p className="pc-desc">{c.blurb}</p>
            <div className="pc-meta">
              <span className="m">
                {c.count} project{c.count !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
