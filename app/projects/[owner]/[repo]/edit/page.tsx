import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories } from "@/lib/db/schema";
import { getProject } from "@/lib/projects";
import { EditForm } from "@/components/edit-form";

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
  if (!userId || project.claimedById !== userId) {
    // Editing is claimant-only; everyone else goes through the claim flow.
    redirect(`${projectPath}/claim`);
  }

  const [cats, current] = await Promise.all([
    db.select().from(categories).orderBy(categories.sort),
    db
      .select({ slug: categories.slug })
      .from(projectCategories)
      .innerJoin(categories, eq(projectCategories.categoryId, categories.id))
      .where(eq(projectCategories.projectId, project.id)),
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
          initial={{
            name: project.name,
            tagline: project.tagline ?? "",
            websiteUrl: project.websiteUrl ?? "",
            maintainerNote: project.maintainerNote ?? "",
            categorySlugs: current.map((c) => c.slug),
          }}
        />
      </div>
    </div>
  );
}
