import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projects, projectStats } from "@/lib/db/schema";
import { listProjects } from "@/lib/projects";
import { formatCount } from "@/lib/format";
import { ProjectCard } from "@/components/project-card";
import { BorderBeam } from "@/components/border-beam";
import { IconArrowRight, IconSearch, IconShield } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, cats, counts] = await Promise.all([
    listProjects({ sort: "gh-stars" }).then((all) => all.slice(0, 6)),
    db.select().from(categories).orderBy(categories.sort),
    db
      .select({
        projects: sql<number>`count(*)`,
        ghStars: sql<number>`coalesce(sum(${projectStats.stars}), 0)`,
      })
      .from(projects)
      .leftJoin(projectStats, sql`${projectStats.projectId} = ${projects.id}`),
  ]);
  const stat = counts[0] ?? { projects: 0, ghStars: 0 };

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <div className="hero-bg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero-poster"
            src="/assets/hero-background-poster.jpg"
            alt=""
          />
        </div>
        <div className="hero-overlay" />
        <div className="container hero-inner">
          <span className="eyebrow on-dark">An Eigenwelt Labs index</span>
          <h1 className="display-xl" style={{ marginTop: 18 }}>
            Open Source
            <br />
            for <span className="mark-hl">the Law.</span>
          </h1>
          <p className="hero-sub">
            A community index of open-source legal software — from matter
            management to citation parsing. Submitted by the community, measured
            against GitHub, claimed by the maintainers who build it.
          </p>
          <form className="hero-search" action="/projects" role="search">
            <IconSearch />
            <input
              type="search"
              name="q"
              placeholder="Search projects, e.g. docket, contract, citation…"
              aria-label="Search the index"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="v">{formatCount(stat.projects)}</span>
              <span className="l">Projects</span>
            </span>
            <span className="hero-stat">
              <span className="v">{formatCount(Number(stat.ghStars))}</span>
              <span className="l">GitHub stars indexed</span>
            </span>
            <span className="hero-stat">
              <span className="v">{cats.length}</span>
              <span className="l">Categories</span>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Browse by category</span>
            <h2 className="display-s">From practice management to legal AI.</h2>
          </div>
          <div className="cat-row">
            {cats.map((c) => (
              <Link
                key={c.slug}
                href={`/projects?category=${c.slug}`}
                className="glass-chip"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div className="row">
              <div className="stack-8">
                <span className="eyebrow">Most starred</span>
                <h2 className="display-s">The load-bearing projects.</h2>
              </div>
              <Link href="/projects" className="btn btn-pill">
                Browse the full index
                <IconArrowRight />
              </Link>
            </div>
          </div>
          {featured.length > 0 ? (
            <div className="project-grid">
              {featured.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="es-icon">
                <IconSearch />
              </div>
              <h4>The index is empty</h4>
              <p>
                Be the first: submit an open-source legal project and it will
                appear here with live GitHub stats.
              </p>
              <Link href="/submit" className="btn btn-primary">
                Submit a project
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            className="glass-strong panel"
            style={{
              borderRadius: "var(--radius-xl)",
              position: "relative",
              isolation: "isolate",
              overflow: "hidden",
            }}
          >
            <BorderBeam radius={24} />
            <div
              className="row-between"
              style={{ position: "relative", zIndex: 1 }}
            >
              <div className="stack-8" style={{ maxWidth: 560 }}>
                <span className="eyebrow">For maintainers</span>
                <h2 className="display-s">Build one of these? Claim it.</h2>
                <p className="body">
                  Verify ownership through GitHub and take over your project's
                  page: set the tagline, curate categories, and carry the
                  maintainer mark.
                </p>
              </div>
              <Link href="/projects" className="btn btn-primary btn-lg">
                <IconShield />
                Find your project
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
