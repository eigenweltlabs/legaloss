import Link from "next/link";
import type { Metadata } from "next";
import { listStarActivity, type StarRow } from "@/lib/projects";
import { projectHref, sourceLabel } from "@/lib/sources";
import { IconStar } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stars",
  robots: { index: false, follow: false },
};

type Grouped = {
  projectId: number;
  href: string;
  fullName: string;
  name: string;
  source: string;
  count: number;
  last: Date;
  starrers: StarRow[];
};

function memberLabel(r: StarRow): string {
  return r.userName ?? r.userUsername ?? r.userId;
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Admin rights are enforced by app/admin/layout.tsx for every /admin route. */
export default async function AdminStarsPage() {
  const rows = await listStarActivity();

  const byProject = new Map<number, Grouped>();
  for (const r of rows) {
    const g = byProject.get(r.projectId) ?? {
      projectId: r.projectId,
      href: projectHref(r),
      fullName: `${r.owner}/${r.repo}`,
      name: r.name,
      source: r.source,
      count: 0,
      last: r.createdAt,
      starrers: [],
    };
    g.count += 1;
    g.starrers.push(r);
    if (r.createdAt > g.last) g.last = r.createdAt;
    byProject.set(r.projectId, g);
  }
  // Most-starred first; recency breaks ties so new activity surfaces.
  const groups = [...byProject.values()].sort(
    (a, b) => b.count - a.count || b.last.getTime() - a.last.getTime(),
  );
  const members = new Set(rows.map((r) => r.userId));

  return (
    <div className="stack-24">
      <div className="narrow">
        <div className="section-head">
          <h1 className="display-m">Stars.</h1>
          <p className="body-l">
            Every community star cast on the index, and who cast it. Site stars
            are separate from a project&apos;s GitHub stargazers, and they drive
            the directory&apos;s default sort.
          </p>
        </div>
      </div>

      <div className="gh-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-tile is-blue">
          <span className="stat-v">{rows.length}</span>
          <span className="stat-l">Stars cast</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{groups.length}</span>
          <span className="stat-l">Projects starred</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{members.size}</span>
          <span className="stat-l">Members starring</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">
            <IconStar />
          </div>
          <h4>No stars yet</h4>
          <p>
            Nobody has starred a project. Once they do, every star shows up here
            with the member who cast it.
          </p>
        </div>
      ) : (
        <ul className="admin-rows">
          {groups.map((g) => (
            <li key={g.projectId}>
              <div className="stack-4" style={{ minWidth: 0 }}>
                <Link href={g.href} className="mono">
                  {g.fullName}
                </Link>
                <span className="body-s">
                  {g.starrers
                    .map((s) => `${memberLabel(s)} (${day(s.createdAt)})`)
                    .join(" · ")}
                  {g.source === "huggingface" ? ` · ${sourceLabel(g.source)}` : ""}
                </span>
              </div>
              <span className="badge badge-accent" title="Community stars">
                <IconStar filled />
                {g.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
