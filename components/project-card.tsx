import Link from "next/link";
import type { ProjectListItem } from "@/lib/projects";
import { formatCount, timeAgo } from "@/lib/format";
import { projectHref } from "@/lib/sources";
import { CardStar } from "@/components/card-star";
import { IconClock, IconDownload, IconFork, IconHuggingFace, IconStar } from "@/components/icons";

export function ProjectCard({
  project,
  signedIn,
}: {
  project: ProjectListItem;
  signedIn: boolean;
}) {
  const desc = project.tagline ?? project.description;
  const isHf = project.source === "huggingface";
  return (
    <div className="card card-hover project-card">
      <div className="pc-cat">
        <span>
          {project.categories.length > 0
            ? project.categories
                .slice(0, 2)
                .map((c) => c.name)
                .join(" · ")
            : "Uncategorized"}
        </span>
        {isHf ? (
          <span className="status-pill is-hf" title="Hosted on Hugging Face">
            <IconHuggingFace />
            {project.sourceType ?? "model"}
          </span>
        ) : project.claimedById ? (
          <span className="status-pill is-claimed" title="Claimed by its maintainer">
            <span className="dot" />
            Maintained
          </span>
        ) : project.archived ? (
          <span className="status-pill is-archived">Archived</span>
        ) : null}
      </div>
      <div className="pc-top">
        <div style={{ minWidth: 0 }}>
          <Link href={projectHref(project)} className="pc-link">
            <span className="pc-name">{project.name}</span>
          </Link>
          <div className="pc-owner">
            {project.owner}/{project.repo}
          </div>
        </div>
      </div>
      {desc ? <p className="pc-desc">{desc}</p> : <p className="pc-desc" />}
      <div className="pc-meta">
        <span className="m" title={isHf ? "Hugging Face likes" : "GitHub stars"}>
          <IconStar filled />
          {formatCount(project.ghStars)}
        </span>
        {isHf ? (
          <span className="m" title="Downloads">
            <IconDownload />
            {formatCount(project.downloads)}
          </span>
        ) : (
          <span className="m" title="Forks">
            <IconFork />
            {formatCount(project.forks)}
          </span>
        )}
        <span className="m" title={isHf ? "Last updated" : "Last push"}>
          <IconClock />
          {timeAgo(project.pushedAt)}
        </span>
        {project.language && <span className="m">{project.language}</span>}
        <span className="pc-star-slot">
          <CardStar
            projectId={project.id}
            initialStarred={project.starredByUser}
            initialCount={project.siteStars}
            signedIn={signedIn}
          />
        </span>
      </div>
    </div>
  );
}
