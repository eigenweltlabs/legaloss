import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories } from "@/lib/db/schema";
import { canEditProject, listProjectMaintainers } from "@/lib/maintainers";
import {
  ensureFreshReadme,
  ensureFreshStats,
  getCustomReadme,
  getProject,
} from "@/lib/projects";
import { EditForm } from "@/components/edit-form";
import { MaintainerManager } from "@/components/maintainer-manager";
import { ReadmeEditor } from "@/components/readme-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const project = await getProject(owner, repo);
  if (!project) notFound();

  const projectPath = `/projects/${project.owner}/${project.repo}`;
  const { userId } = await auth();
  if (!userId || !(await canEditProject(project, userId))) {
    // Editing is for the claimant and added maintainers; everyone else goes
    // through the claim flow.
    redirect(`${projectPath}/claim`);
  }
  const isClaimant = project.claimedById === userId;

  // The editor starts from the maintainer override when one exists, otherwise
  // from the cached GitHub README rendering.
  const stats = await ensureFreshStats(project);
  const custom = await getCustomReadme(project.id);
  const github = stats
    ? await ensureFreshReadme(project, stats.defaultBranch ?? "main")
    : null;
  const initialHtml = custom.customHtml ?? github ?? "";
  const hasOverride = Boolean(custom.customHtml);

  const [cats, current, maintainers] = await Promise.all([
    db.select().from(categories).orderBy(categories.sort),
    db
      .select({ slug: categories.slug })
      .from(projectCategories)
      .innerJoin(categories, eq(projectCategories.categoryId, categories.id))
      .where(eq(projectCategories.projectId, project.id)),
    isClaimant ? listProjectMaintainers(project.id) : Promise.resolve([]),
  ]);

  return (
    <div className="container">
      <div className="narrow">
        <div className="section-head">
          <span className="eyebrow">Maintainer</span>
          <h1 className="display-m">
            Edit{" "}
            <span className="mono" style={{ fontSize: "0.72em", letterSpacing: "-0.02em" }}>
              {project.owner}/{project.repo}
            </span>
          </h1>
          <p className="body-l">
            You verified ownership through GitHub, so this page is yours to
            curate. Stats stay live from the source.
          </p>
        </div>
        <EditForm
          projectId={project.id}
          projectPath={projectPath}
          categories={cats.map((c) => ({ slug: c.slug, name: c.name }))}
          isClaimant={isClaimant}
          initial={{
            name: project.name,
            tagline: project.tagline ?? "",
            websiteUrl: project.websiteUrl ?? "",
            maintainerNote: project.maintainerNote ?? "",
            categorySlugs: current.map((c) => c.slug),
          }}
        />

        {isClaimant && (
          <div style={{ marginTop: 48 }}>
            <h2 className="form-label">Additional maintainers</h2>
            <p className="form-hint" style={{ margin: "0 0 14px" }}>
              Grant other GitHub accounts the same editing rights; they take
              effect as soon as that person signs in with GitHub connected.
              Adding and removing saves instantly — the Save button above
              doesn&apos;t apply here.
            </p>
            <MaintainerManager
              projectId={project.id}
              maintainers={maintainers.map((m) => ({ githubLogin: m.githubLogin }))}
            />
          </div>
        )}

        <div style={{ marginTop: 48 }}>
          <h2 className="form-label">README</h2>
          <p className="form-hint" style={{ margin: "0 0 14px" }}>
            Shown on the project page instead of the GitHub README. Reset any
            time.
          </p>
          <ReadmeEditor
            projectId={project.id}
            initialHtml={initialHtml}
            hasOverride={hasOverride}
          />
        </div>
      </div>
    </div>
  );
}
