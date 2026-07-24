import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import {
  listFeaturedProjects,
  listFilterOptions,
  listProjects,
  type SortKey,
} from "@/lib/projects";
import { ProjectCard } from "@/components/project-card";
import { BrowseControls } from "@/components/browse-controls";
import { FeaturedRotator } from "@/components/featured-rotator";
import { NewsletterForm } from "@/components/newsletter-form";
import { IconSearch } from "@/components/icons";

export const dynamic = "force-dynamic";

const VALID_SORTS: SortKey[] = [
  "gh-stars",
  "site-stars",
  "rating",
  "newest",
  "active",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const language = typeof params.lang === "string" ? params.lang : undefined;
  const license = typeof params.license === "string" ? params.license : undefined;
  const activeOnly = params.active === "1";
  const sortParam = typeof params.sort === "string" ? params.sort : "gh-stars";
  const sort = (VALID_SORTS as string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : "gh-stars";

  const { userId } = await auth();
  const [items, cats, filterOptions, featured] = await Promise.all([
    listProjects({ q, categorySlug: category, sort, language, license, activeOnly, userId }),
    db.select().from(categories).orderBy(categories.sort),
    listFilterOptions(),
    listFeaturedProjects(),
  ]);
  const activeCat = cats.find((c) => c.slug === category);

  return (
    <div className="container">
      <div className="dir-head">
        <div>
          <h1 className="display-m">
            {activeCat ? activeCat.name : "Open source for the law."}
          </h1>
          <p className="dir-sub">
            {activeCat?.blurb ??
              "Every project is a real GitHub repository, stats refreshed from the source. One listing per repo, reviewed by the community, claimed by its maintainer."}
          </p>
        </div>
        <span className="meta-mono">
          {items.length} project{items.length !== 1 ? "s" : ""}
          {activeCat ? "" : " indexed"}
        </span>
      </div>

      <FeaturedRotator items={featured} />

      <Suspense>
        <BrowseControls
          languages={filterOptions.languages}
          licenses={filterOptions.licenses}
        />
      </Suspense>

      <div className="cat-row">
        <CatChip href="/" label="All" active={!category} />
        {cats.map((c) => (
          <CatChip
            key={c.slug}
            href={`/?category=${c.slug}`}
            label={c.name}
            active={c.slug === category}
          />
        ))}
      </div>

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} signedIn={userId !== null} />
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
              : "No projects in this category yet. Submit the first one."}
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit a project
          </Link>
        </div>
      )}

      <section className="newsletter-band glass">
        <span className="eyebrow">Newsletter</span>
        <p>A list of new open-source legal projects, every few weeks.</p>
        <NewsletterForm />
      </section>

      <div className="claim-band">
        <div className="stack-4">
          <span className="eyebrow">For maintainers</span>
          <p>
            Build one of these? Verify ownership through GitHub and take over
            your project&apos;s page: tagline, categories, maintainer&apos;s
            note.
          </p>
        </div>
        <Link href="/about" className="btn btn-secondary">
          How claiming works
        </Link>
      </div>
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
