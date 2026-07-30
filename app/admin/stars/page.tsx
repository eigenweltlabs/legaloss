import type { Metadata } from "next";
import { listStarActivity } from "@/lib/projects";
import { AdminStars } from "@/components/admin-stars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stars",
  robots: { index: false, follow: false },
};

const RECENT_WINDOW_DAYS = 30;

/** Stars cast within the recency window, counted at request time. */
function countRecent(rows: { createdAt: Date }[]): number {
  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return rows.filter((r) => r.createdAt.getTime() >= cutoff).length;
}

/** Admin rights are enforced by app/admin/layout.tsx for every /admin route. */
export default async function AdminStarsPage() {
  const rows = await listStarActivity();

  const projects = new Set(rows.map((r) => r.projectId));
  const members = new Set(rows.map((r) => r.userId));
  const recent = countRecent(rows);

  return (
    <div className="admin-wide stack-24">
      <div className="section-head">
        <h1 className="display-m">Stars.</h1>
        <p className="body-l">
          Every community star cast on the index, and who cast it. Site stars
          are separate from a project&apos;s GitHub stargazers, and they drive
          the directory&apos;s default sort.
        </p>
      </div>

      <div className="admin-stats">
        <div className="stat-tile is-blue">
          <span className="stat-v">{rows.length}</span>
          <span className="stat-l">Stars cast</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{projects.size}</span>
          <span className="stat-l">Projects starred</span>
        </div>
        <div className="stat-tile">
          <span className="stat-v">{members.size}</span>
          <span className="stat-l">Members starring</span>
        </div>
        <div className="stat-tile is-violet">
          <span className="stat-v">{recent}</span>
          <span className="stat-l">Last {RECENT_WINDOW_DAYS} days</span>
        </div>
      </div>

      <AdminStars rows={rows} />
    </div>
  );
}
