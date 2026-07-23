import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories, users } from "@/lib/db/schema";
import {
  ensureFreshContributors,
  ensureFreshReadme,
  ensureFreshStats,
  getProject,
  getProjectSocial,
} from "@/lib/projects";
import { formatCount, formatDate, timeAgo } from "@/lib/format";
import { StarButton } from "@/components/star-button";
import { CommentComposer } from "@/components/comment-composer";
import { ReviewComposer } from "@/components/review-composer";
import { EntryDelete } from "@/components/entry-delete";
import {
  IconExternal,
  IconGitHub,
  IconMessage,
  IconPencil,
  IconShield,
  IconStar,
} from "@/components/icons";

export const dynamic = "force-dynamic";

type Params = Promise<{ owner: string; repo: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo}` };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { owner, repo } = await params;
  const project = await getProject(owner, repo);
  if (!project) notFound();

  const { userId } = await auth();

  const [stats, cats, social, claimant, contributors] = await Promise.all([
    ensureFreshStats(project),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(projectCategories)
      .innerJoin(categories, eq(projectCategories.categoryId, categories.id))
      .where(eq(projectCategories.projectId, project.id))
      .orderBy(categories.sort),
    getProjectSocial(project.id, userId ?? null),
    project.claimedById
      ? db
          .select()
          .from(users)
          .where(eq(users.id, project.claimedById))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    ensureFreshContributors(project),
  ]);
  const readmeHtml = stats
    ? await ensureFreshReadme(project, stats.defaultBranch ?? "main")
    : null;

  const isClaimant = userId !== null && project.claimedById === userId;
  const avgRating =
    social.reviews.length > 0
      ? social.reviews.reduce((s, r) => s + r.rating, 0) / social.reviews.length
      : null;
  const myReview = userId
    ? (social.reviews.find((r) => r.userId === userId) ?? null)
    : null;
  const ghUrl = `https://github.com/${project.owner}/${project.repo}`;

  return (
    <div className="container">
      <div className="detail-head">
        <span className="eyebrow">
          {cats.length > 0 ? cats.map((c) => c.name).join(" · ") : "Project"}
        </span>
        <div className="detail-title-row">
          <div className="stack-8" style={{ minWidth: 0 }}>
            <h1 className="display-m">
              {project.name}
              {project.claimedById ? (
                <span className="status-pill is-claimed">
                  <span className="dot" />
                  Maintained
                </span>
              ) : stats?.archived ? (
                <span className="status-pill is-archived">Archived</span>
              ) : null}
            </h1>
            <div className="mono" style={{ color: "var(--muted)" }}>
              {project.owner}/{project.repo}
            </div>
            {(project.tagline ?? stats?.description) && (
              <p className="body-l" style={{ maxWidth: 640 }}>
                {project.tagline ?? stats?.description}
              </p>
            )}
          </div>
          <div className="detail-actions">
            <StarButton
              projectId={project.id}
              initialStarred={social.starredByUser}
              initialCount={social.starCount}
              signedIn={userId !== null}
            />
            <a
              href={ghUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              <IconGitHub />
              GitHub
            </a>
            {isClaimant ? (
              <Link
                href={`/projects/${project.owner}/${project.repo}/edit`}
                className="btn btn-secondary"
              >
                <IconPencil />
                Edit
              </Link>
            ) : !project.claimedById ? (
              <Link
                href={`/projects/${project.owner}/${project.repo}/claim`}
                className="btn btn-pill"
              >
                <IconShield />
                Claim this project
              </Link>
            ) : null}
          </div>
        </div>
        {cats.length > 0 && (
          <div className="cluster">
            {cats.map((c) => (
              <Link key={c.slug} href={`/?category=${c.slug}`} className="tag">
                {c.name}
              </Link>
            ))}
            {stats?.topics.slice(0, 5).map((t) => (
              <span key={t} className="badge badge-neutral">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div>
          {readmeHtml ? (
            <article
              className="readme"
              // GitHub renders and sanitizes this HTML server-side.
              dangerouslySetInnerHTML={{ __html: readmeHtml }}
            />
          ) : (
            <div className="empty-state">
              <div className="es-icon">
                <IconGitHub />
              </div>
              <h4>No README available</h4>
              <p>
                GitHub didn't return a README for this repository — view it
                directly on GitHub instead.
              </p>
              <a href={ghUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Open on GitHub
              </a>
            </div>
          )}
        </div>

        <aside className="side-panel">
          <div className="glass side-card" style={{ borderRadius: "var(--radius-lg)" }}>
            <h3>GitHub</h3>
            <div className="gh-stats">
              <div className="stat-tile is-blue">
                <span className="stat-v">{formatCount(stats?.stars ?? 0)}</span>
                <span className="stat-l">Stars</span>
              </div>
              <div className="stat-tile is-violet">
                <span className="stat-v">{formatCount(stats?.forks ?? 0)}</span>
                <span className="stat-l">Forks</span>
              </div>
              <div className="stat-tile is-blue">
                <span className="stat-v">{formatCount(stats?.openIssues ?? 0)}</span>
                <span className="stat-l">Open issues</span>
              </div>
              <div className="stat-tile is-violet">
                <span className="stat-v">{formatCount(stats?.subscribers ?? 0)}</span>
                <span className="stat-l">Watchers</span>
              </div>
            </div>
            <p className="form-hint" style={{ marginTop: 10 }}>
              Fetched from GitHub {stats ? timeAgo(stats.fetchedAt) : "—"}.
            </p>
          </div>

          <div className="card side-card">
            <h3>About</h3>
            <div className="kv">
              <span className="k">License</span>
              <span className="v">{stats?.licenseSpdx ?? "Unknown"}</span>
            </div>
            <div className="kv">
              <span className="k">Language</span>
              <span className="v">{stats?.language ?? "—"}</span>
            </div>
            <div className="kv">
              <span className="k">Last push</span>
              <span className="v">{timeAgo(stats?.pushedAt ?? null)}</span>
            </div>
            <div className="kv">
              <span className="k">Indexed</span>
              <span className="v">{formatDate(project.createdAt)}</span>
            </div>
            {(project.websiteUrl ?? stats?.homepage) && (
              <div className="kv">
                <span className="k">Website</span>
                <span className="v">
                  <a
                    href={project.websiteUrl ?? stats?.homepage ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortUrl(project.websiteUrl ?? stats?.homepage ?? "")}
                    <IconExternal
                      style={{
                        width: 11,
                        height: 11,
                        display: "inline",
                        marginLeft: 4,
                        verticalAlign: "-1px",
                      }}
                    />
                  </a>
                </span>
              </div>
            )}
          </div>

          {contributors && contributors.data.length > 0 && (
            <div className="card side-card">
              <h3>Authors</h3>
              <div className="authors-grid">
                {contributors.data.slice(0, 24).map((c) => (
                  <a
                    key={c.login}
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="author"
                    title={`@${c.login} · ${c.contributions} commit${c.contributions !== 1 ? "s" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${c.avatarUrl}&s=64`} alt={`@${c.login}`} loading="lazy" />
                  </a>
                ))}
              </div>
              <p className="form-hint" style={{ marginTop: 12 }}>
                <a
                  href={`https://github.com/${project.owner}/${project.repo}/graphs/contributors`}
                  target="_blank"
                  rel="noreferrer"
                  className="accent"
                >
                  {contributors.hasMore
                    ? `100+ contributors on GitHub →`
                    : `${contributors.data.length} contributor${contributors.data.length !== 1 ? "s" : ""} on GitHub →`}
                </a>
              </p>
            </div>
          )}

          <div className="card side-card">
            <h3>Maintainer</h3>
            {claimant ? (
              <div className="stack-8">
                <div className="cluster">
                  <span className="avatar">
                    {claimant.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={claimant.imageUrl} alt="" />
                    ) : (
                      initials(claimant.name)
                    )}
                  </span>
                  <div className="stack-4">
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                      {claimant.name ?? "Maintainer"}
                    </span>
                    {claimant.githubLogin && (
                      <a
                        href={`https://github.com/${claimant.githubLogin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)" }}
                      >
                        @{claimant.githubLogin}
                      </a>
                    )}
                  </div>
                </div>
                <p className="form-hint">
                  Ownership verified via GitHub{" "}
                  {project.claimedAt ? `on ${formatDate(project.claimedAt)}` : ""}.
                </p>
              </div>
            ) : (
              <div className="stack-8">
                <p className="body-s">
                  Unclaimed. If this is your project, verify ownership through
                  GitHub to edit its page.
                </p>
                <Link
                  href={`/projects/${project.owner}/${project.repo}/claim`}
                  className="btn btn-secondary btn-sm"
                >
                  <IconShield />
                  Claim it
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="social-grid">
        <section className="social-section">
          <div className="social-head">
            <h2>Reviews</h2>
            <span className="social-count">{social.reviews.length}</span>
            {avgRating !== null && (
              <span className="review-avg-inline">
                <span className="avg">{avgRating.toFixed(1)}</span>
                <Rating value={Math.round(avgRating)} />
              </span>
            )}
          </div>
          <ReviewComposer
            projectId={project.id}
            signedIn={userId !== null}
            existing={
              myReview
                ? { rating: myReview.rating, title: myReview.title, body: myReview.body }
                : null
            }
          />
          {social.reviews.length > 0 ? (
            <div>
              {social.reviews.map((r) => (
                <div key={r.id} className="entry">
                  <span className="avatar">
                    {r.authorImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.authorImage} alt="" />
                    ) : (
                      initials(r.authorName)
                    )}
                  </span>
                  <div className="entry-body">
                    <div className="entry-head">
                      <span className="entry-author">{r.authorName ?? "Member"}</span>
                      <Rating value={r.rating} />
                      <span className="entry-date">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.title && <div className="entry-title">{r.title}</div>}
                    {r.body && <div className="entry-text">{r.body}</div>}
                    {userId === r.userId && (
                      <div className="entry-actions">
                        <EntryDelete kind="review" id={r.id} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="es-icon">
                <IconStar />
              </div>
              <h4>No reviews yet</h4>
              <p>Used this in practice? Your judgment is the signal.</p>
            </div>
          )}
        </section>

        <section className="social-section">
          <div className="social-head">
            <h2>Discussion</h2>
            <span className="social-count">{social.comments.length}</span>
          </div>
          <CommentComposer projectId={project.id} signedIn={userId !== null} />
          {social.comments.length > 0 ? (
            <div>
              {social.comments.map((c) => (
                <div key={c.id} className="entry">
                  <span className="avatar">
                    {c.authorImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.authorImage} alt="" />
                    ) : (
                      initials(c.authorName)
                    )}
                  </span>
                  <div className="entry-body">
                    <div className="entry-head">
                      <span className="entry-author">{c.authorName ?? "Member"}</span>
                      <span className="entry-date">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="entry-text">{c.body}</div>
                    {userId === c.userId && (
                      <div className="entry-actions">
                        <EntryDelete kind="comment" id={c.id} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="es-icon">
                <IconMessage />
              </div>
              <h4>No comments yet</h4>
              <p>Start the discussion.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} filled={n <= value} className={n <= value ? "" : "is-empty"} />
      ))}
    </span>
  );
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
