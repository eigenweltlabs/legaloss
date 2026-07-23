import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { listProjects, type SortKey } from "@/lib/projects";
import { ProjectCard } from "@/components/project-card";
import { BrowseControls } from "@/components/browse-controls";
import { IconSearch } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Directory" };

const VALID_SORTS: SortKey[] = [
  "gh-stars",
  "site-stars",
  "rating",
  "newest",
  "active",
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : "gh-stars";
  const sort = (VALID_SORTS as string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : "gh-stars";

  const [items, cats] = await Promise.all([
    listProjects({ q, categorySlug: category, sort }),
    db.select().from(categories).orderBy(categories.sort),
  ]);
  const activeCat = cats.find((c) => c.slug === category);

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Directory</span>
        <h1 className="display-m">
          {activeCat ? activeCat.name : "Every project in the index."}
        </h1>
        {activeCat?.blurb && <p className="body-l">{activeCat.blurb}</p>}
      </div>

      <Suspense>
        <BrowseControls />
      </Suspense>

      <div className="cat-row">
        <CatChip href="/projects" label="All" active={!category} />
        {cats.map((c) => (
          <CatChip
            key={c.slug}
            href={`/projects?category=${c.slug}`}
            label={c.name}
            active={c.slug === category}
          />
        ))}
      </div>

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="es-icon">
            <IconSearch />
          </div>
          <h4>Nothing here yet</h4>
          <p>
            {q
              ? `No projects match “${q}”. Try another term, or add the project you're thinking of.`
              : "No projects in this category yet — submit the first one."}
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit a project
          </Link>
        </div>
      )}
    </div>
  );
}

function CatChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href} className={`glass-chip${active ? " is-active" : ""}`}>
      {label}
    </Link>
  );
}
