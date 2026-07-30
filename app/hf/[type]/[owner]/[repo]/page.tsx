import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories, projectStats, users } from "@/lib/db/schema";
import { isAdminUser } from "@/lib/admin";
import { canEditProject, listProjectMaintainers } from "@/lib/maintainers";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { hfTypeLabel } from "@/lib/huggingface";
import { projectHref, sourceExternalUrl } from "@/lib/sources";
import {
  ensureFreshReadme,
  ensureFreshStats,
  getCustomReadme,
  getHfProject,
  getProjectSocial,
} from "@/lib/projects";
import { formatCount, formatDate, timeAgo } from "@/lib/format";
import { StarButton } from "@/components/star-button";
import { CommentComposer } from "@/components/comment-composer";
import { MaintainerCardExtras } from "@/components/maintainer-card-extras";
import { MaintainerNote } from "@/components/maintainer-note";
import { FeatureToggle } from "@/components/feature-toggle";
import { ReviewComposer } from "@/components/review-composer";
import { EntryDelete } from "@/components/entry-delete";
import {
  IconExternal,
  IconHuggingFace,
  IconMessage,
  IconPencil,
  IconShield,
  IconStar,
} from "@/components/icons";

export const dynamic = "force-dynamic";

type Params = Promise<{ type: string; owner: string; repo: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { type, owner, repo } = await params;
  const project = await getHfProject(type, owner, repo);
  if (!project) return { title: `${owner}/${repo}` };

  const stats = await db
    .select({ description: projectStats.description })
    .from(projectStats)
    .where(eq(projectStats.projectId, project.id))
    .limit(1)
    .then((r) => r[0] ?? null);
  const description =
    project.tagline ??
    stats?.description ??
    `${project.owner}/${project.repo} — a ${hfTypeLabel(project.sourceType).toLowerCase()} on Hugging Face, indexed on ${SITE_NAME}.`;
  const url = `${SITE_URL}${projectHref(project)}`;

  return {
    title: `${project.name} — open-source legal ${hfTypeLabel(project.sourceType).toLowerCase()}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: project.name, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title: project.name, description },
  };
}

export default async function HfProjectPage({ params }: { params: Params }) {
  const { type, owner, repo } = await params;
  const project = await getHfProject(type, owner, repo);
  if (!project) notFound();

  const { userId } = await auth();

  const [stats, cats, social, claimant, maintainers] = await Promise.all([
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
    listProjectMaintainers(project.id),
  ]);
  const custom = await getCustomReadme(project.id);
  const cardHtml =
    custom.customHtml ??
    (stats ? await ensureFreshReadme(project, "main") : null);

  const canEdit = await canEditProject(project, userId ?? null);
  const isClaimant = userId !== null && project.claimedById === userId;
  const isAdmin = isAdminUser(userId);
  const avgRating =
    social.reviews.length > 0
      ? social.reviews.reduce((s, r) => s + r.rating, 0) / social.reviews.length
      : null;
  const myReview = userId
    ? (social.reviews.find((r) => r.userId === userId) ?? null)
    : null;
  const hfUrl = sourceExternalUrl(project);
  const typeLabel = hfTypeLabel(project.sourceType);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.name,
    description: project.tagline ?? stats?.description ?? undefined,
    url: `${SITE_URL}${projectHref(project)}`,
    codeRepository: hfUrl,
    programmingLanguage: stats?.language ?? undefined,
    dateModified: stats?.pushedAt?.toISOString(),
    keywords:
      [...cats.map((c) => c.name), ...(stats?.topics ?? [])].join(", ") || undefined,
    ...(avgRating !== null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(avgRating.toFixed(1)),
        reviewCount: social.reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="detail-head">
        <span className="eyebrow">
          {cats.length > 0 ? cats.map((c) => c.name).join(" · ") : typeLabel}
        </span>
        <div className="detail-title-row">
          <div className="stack-8" style={{ minWidth: 0 }}>
            <h1 className="display-m">
              {project.name}
              <span className="status-pill is-hf" style={{ verticalAlign: "middle", marginLeft: 12 }}>
                <IconHuggingFace />
                {typeLabel}
              </span>
              {project.claimedById && (
                <span className="status-pill is-claimed" style={{ marginLeft: 8 }}>
                  <span className="dot" />
                  Maintained
                </span>
              )}
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
            {isAdmin && (
              <FeatureToggle projectId={project.id} initialFeatured={project.featured} />
            )}
            <StarButton
              projectId={project.id}
              initialStarred={social.starredByUser}
              initialCount={social.starCount}
              signedIn={userId !== null}
            />
            <a href={hfUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <IconHuggingFace />
              Hugging Face
            </a>
            {project.websiteUrl && (
              <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <IconExternal />
                Website
              </a>
            )}
            {canEdit ? (
              <Link href={`${projectHref(project)}/edit`} className="btn btn-secondary">
                <IconPencil />
                Edit
              </Link>
            ) : !project.claimedById ? (
              <Link href={`${projectHref(project)}/claim`} className="btn btn-pill">
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
          {project.maintainerNote && <MaintainerNote note={project.maintainerNote} />}
          {cardHtml ? (
            <>
              <article className="readme" dangerouslySetInnerHTML={{ __html: cardHtml }} />
              {custom.customHtml && (
                <p className="form-hint" style={{ marginTop: 10 }}>
                  Card curated by the maintainer
                  {custom.customUpdatedAt ? ` · ${formatDate(custom.customUpdatedAt)}` : ""}
                  {" · "}
                  <a href={hfUrl} target="_blank" rel="noreferrer" className="accent">
                    original on Hugging Face →
                  </a>
                </p>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="es-icon">
                <IconHuggingFace />
              </div>
              <h4>No card available</h4>
              <p>Hugging Face didn&apos;t return a card for this repository.</p>
              <a href={hfUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Open on Hugging Face
              </a>
            </div>
          )}
        </div>

        <aside className="side-panel">
          <div className="glass side-card" style={{ borderRadius: "var(--radius-lg)" }}>
            <h3>Hugging Face</h3>
            <div className="gh-stats">
              <div className="stat-tile is-blue">
                <span className="stat-v">{formatCount(stats?.stars ?? 0)}</span>
                <span className="stat-l">Likes</span>
              </div>
              <div className="stat-tile is-violet">
                <span className="stat-v">{formatCount(stats?.downloads ?? 0)}</span>
                <span className="stat-l">Downloads</span>
              </div>
            </div>
            <p className="form-hint" style={{ marginTop: 10 }}>
              Fetched from Hugging Face {stats ? timeAgo(stats.fetchedAt) : "–"}.
            </p>
          </div>

          <div className="card side-card">
            <h3>About</h3>
            <div className="kv">
              <span className="k">Type</span>
              <span className="v">{typeLabel}</span>
            </div>
            {stats?.language && (
              <div className="kv">
                <span className="k">Task</span>
                <span className="v">{stats.language}</span>
              </div>
            )}
            <div className="kv">
              <span className="k">License</span>
              <span className="v">{stats?.licenseSpdx ?? "Unknown"}</span>
            </div>
            <div className="kv">
              <span className="k">Updated</span>
              <span className="v">{timeAgo(stats?.pushedAt ?? null)}</span>
            </div>
            <div className="kv">
              <span className="k">Indexed</span>
              <span className="v">{formatDate(project.createdAt)}</span>
            </div>
            {project.websiteUrl && (
              <div className="kv">
                <span className="k">Website</span>
                <span className="v">
                  <a href={project.websiteUrl} target="_blank" rel="noreferrer">
                    {project.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <IconExternal style={{ width: 11, height: 11, display: "inline", marginLeft: 4, verticalAlign: "-1px" }} />
                  </a>
                </span>
              </div>
            )}
          </div>

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
                  </div>
                </div>
                <MaintainerCardExtras
                  projectId={project.id}
                  maintainers={maintainers.map((m) => ({ githubLogin: m.githubLogin }))}
                  isClaimant={isClaimant}
                />
                <p className="form-hint">
                  Ownership verified via Hugging Face{" "}
                  {project.claimedAt ? `on ${formatDate(project.claimedAt)}` : ""}.
                </p>
              </div>
            ) : (
              <div className="stack-8">
                <p className="body-s">
                  Unclaimed. If this is your model, verify ownership through
                  Hugging Face to edit its page.
                </p>
                <Link href={`${projectHref(project)}/claim`} className="btn btn-secondary btn-sm">
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
