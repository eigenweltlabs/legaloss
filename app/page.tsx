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
import { Pagination } from "@/components/pagination";
import { FeaturedRotator } from "@/components/featured-rotator";
import { IconSearch } from "@/components/icons";
import { isLicenseGroup, knownLicenseGroup } from "@/lib/license";

export const dynamic = "force-dynamic";

const VALID_SORTS: SortKey[] = [
  "stars",
  "site-stars",
  "rating",
  "newest",
  "active",
];

/** Sort keys that used to exist, pointed at what replaced them. */
const LEGACY_SORTS: Record<string, SortKey> = { "gh-stars": "stars" };

/**
 * The index leads with its own community's signal rather than GitHub's.
 * Ties fall back to GitHub stars, so the order stays sensible while site
 * stars are still sparse. Mirrored by SORTS[0] in browse-controls.
 */
const DEFAULT_SORT: SortKey = "site-stars";

const PER_PAGE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const language = typeof params.lang === "string" ? params.lang : undefined;
  // The filter used to take raw SPDX ids, so ?license=MIT is a link that once
  // worked; resolve it to the group that id belongs to. Anything we do not
  // recognize is dropped rather than being read as "other".
  const licenseParam = typeof params.license === "string" ? params.license : "";
  const license = isLicenseGroup(licenseParam)
    ? licenseParam
    : (knownLicenseGroup(licenseParam) ?? undefined);
  const activeOnly = params.active === "1";
  const sortParam = typeof params.sort === "string" ? params.sort : DEFAULT_SORT;
  const sort = (VALID_SORTS as string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : (LEGACY_SORTS[sortParam] ?? DEFAULT_SORT);

  const requestedPage = Math.max(1, Number(params.page) || 1);

  const { userId } = await auth();
  const filters = { q, categorySlug: category, sort, language, license, activeOnly, userId };

  const [firstTry, cats, filterOptions, featured] = await Promise.all([
    listProjects({ ...filters, limit: PER_PAGE, offset: (requestedPage - 1) * PER_PAGE }),
    db
      .select({
        slug: categories.slug,
        name: categories.name,
        blurb: categories.blurb,
      })
      .from(categories)
      .orderBy(categories.sort),
    listFilterOptions(),
    listFeaturedProjects(),
  ]);
  const activeCat = cats.find((c) => c.slug === category);

  // A page past the end (stale link, or a filter narrowed since) lands on the
  // last real page instead of an empty grid. The total rides along with the
  // rows, so an out-of-range page returns none of either — hence the probe.
  let page = requestedPage;
  let { items, total } = firstTry;
  if (items.length === 0 && requestedPage > 1) {
    const probe = await listProjects({ ...filters, limit: 1, offset: 0 });
    page = Math.min(requestedPage, Math.max(1, Math.ceil(probe.total / PER_PAGE)));
    ({ items, total } = await listProjects({
      ...filters,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }));
  }

  const pagerParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page") continue;
    if (typeof v === "string" && v) pagerParams.set(k, v);
    else if (Array.isArray(v) && v[0]) pagerParams.set(k, v[0]);
  }

  return (
    <div className="container">
      <div className="dir-head">
        <div>
          <h1 className="display-m">
            {activeCat ? activeCat.name : "Open Source Legal Software."}
          </h1>
          <p className="dir-sub">
            {activeCat?.blurb ??
              "Every project is a real GitHub repository, stats refreshed from the source. One listing per repo, reviewed by the community, claimed by its maintainer."}
          </p>
        </div>
        <span className="meta-mono">
          {total} project{total !== 1 ? "s" : ""}
          {activeCat ? "" : " indexed"}
        </span>
      </div>

      <FeaturedRotator items={featured} />

      <Suspense>
        <BrowseControls
          categories={cats}
          languages={filterOptions.languages}
          licenses={filterOptions.licenses}
          selectedLicense={license ?? ""}
        />
      </Suspense>

      {items.length > 0 ? (
        <>
          <div className="project-grid">
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} signedIn={userId !== null} />
            ))}
          </div>
          <Pagination
            page={page}
            perPage={PER_PAGE}
            total={total}
            params={pagerParams}
          />
        </>
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
