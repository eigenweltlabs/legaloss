import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";
import { listProjectsForAdmin } from "@/lib/projects";
import { listMembers } from "@/lib/users";
import { projectHref } from "@/lib/sources";
import { AdminClaims } from "@/components/admin-claims";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claims",
  robots: { index: false, follow: false },
};

export default async function AdminClaimsPage() {
  const { userId } = await auth();
  // 404 rather than 403: the route's existence is not worth advertising.
  if (!isAdminUser(userId)) notFound();

  const [projects, members] = await Promise.all([
    listProjectsForAdmin(),
    listMembers(),
  ]);
  const projectHrefs = Object.fromEntries(
    projects.map((p) => [p.id, projectHref(p)]),
  );

  return (
    <div className="container">
      <div className="narrow">
        <div className="section-head">
          <span className="eyebrow">Admin</span>
          <h1 className="display-m">Claims.</h1>
          <p className="body-l">
            Hand a project page to a maintainer who proved control out of band —
            an organization that blocks OAuth apps, a protected default branch,
            a handover. Everything granted here is logged as{" "}
            <span className="mono">admin-grant</span>, so it stays
            distinguishable from a self-verified claim.
          </p>
        </div>

        <AdminClaims
          projects={projects}
          members={members}
          projectHrefs={projectHrefs}
        />
      </div>
    </div>
  );
}
