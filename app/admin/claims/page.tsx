import type { Metadata } from "next";
import { listProjectsForAdmin } from "@/lib/projects";
import { listMembers } from "@/lib/users";
import { projectHref } from "@/lib/sources";
import { AdminClaims } from "@/components/admin-claims";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claims",
  robots: { index: false, follow: false },
};

/** Admin rights are enforced by app/admin/layout.tsx for every /admin route. */
export default async function AdminClaimsPage() {
  const [projects, members] = await Promise.all([
    listProjectsForAdmin(),
    listMembers(),
  ]);
  const projectHrefs = Object.fromEntries(
    projects.map((p) => [p.id, projectHref(p)]),
  );

  return (
    <div className="narrow">
      <div className="section-head">
        <h1 className="display-m">Claims.</h1>
        <p className="body-l">
          Hand a project page to a maintainer who proved control out of band —
          an organization that blocks OAuth apps, a protected default branch, a
          handover. Everything granted here is logged as{" "}
          <span className="mono">admin-grant</span>, so it stays distinguishable
          from a self-verified claim.
        </p>
      </div>

      <AdminClaims
        projects={projects}
        members={members}
        projectHrefs={projectHrefs}
      />
    </div>
  );
}
