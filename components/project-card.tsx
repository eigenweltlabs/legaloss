import Link from "next/link";
import type { ProjectListItem } from "@/lib/projects";
import { formatCount, timeAgo } from "@/lib/format";
import { IconFork, IconStar, IconClock } from "@/components/icons";

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const desc = project.tagline ?? project.description;
  return (
    <Link
      href={`/projects/${project.owner}/${project.repo}`}
      className="card card-hover project-card"
    >
      <div className="pc-top">
        <div>
          <div className="pc-name">{project.name}</div>
          <div className="pc-owner">
            {project.owner}/{project.repo}
          </div>
        </div>
        {project.claimedById ? (
          <span className="status-pill is-claimed" title="Claimed by its maintainer">
            <span className="dot" />
            Maintained
          </span>
        ) : project.archived ? (
          <span className="status-pill is-archived">Archived</span>
        ) : null}
      </div>
      {desc ? <p className="pc-desc">{desc}</p> : <p className="pc-desc" />}
      {project.categories.length > 0 && (
        <div className="pc-tags">
          {project.categories.slice(0, 3).map((c) => (
            <span key={c.slug} className="tag">
              {c.name}
            </span>
          ))}
        </div>
      )}
      <div className="pc-meta">
        <span className="m" title="GitHub stars">
          <IconStar filled />
          {formatCount(project.ghStars)}
        </span>
        <span className="m" title="Forks">
          <IconFork />
          {formatCount(project.forks)}
        </span>
        <span className="m" title="Last push">
          <IconClock />
          {timeAgo(project.pushedAt)}
        </span>
        {project.language && <span className="m">{project.language}</span>}
      </div>
    </Link>
  );
}
