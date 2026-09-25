import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProject } from "@/lib/projects";
import { canEditProject } from "@/lib/maintainers";
import { CLAIM_FILE_NAME, claimToken } from "@/lib/claim-file";
import { projectHref } from "@/lib/sources";
import { FileClaim } from "@/components/file-claim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claim project" };

export default async function CodebergClaimPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const project = await getProject(owner, repo, "codeberg");
  if (!project) notFound();

  const { userId } = await auth();
  const projectPath = projectHref(project);
  const claimPath = `${projectPath}/claim`;
  const canEdit = await canEditProject(project, userId);
  const alreadyClaimedByOther = project.claimedById !== null && !canEdit;

  return (
    <div className="container">
      <div className="narrow">
        <div className="section-head">
          <span className="eyebrow">Maintainer claim</span>
          <h1 className="display-m">
            Claim{" "}
            <span className="mono" style={{ fontSize: "0.72em", letterSpacing: "-0.02em" }}>
              {project.owner}/{project.repo}
            </span>
          </h1>
          <p className="body-l">
            Claim this Codeberg repository by publishing a one-time proof in the
            repository. Claimants can curate its LegalOSS page.
          </p>
        </div>

        {alreadyClaimedByOther ? (
          <div className="notice is-warning">
            This project has already been claimed by its maintainer. If you
            believe that&apos;s wrong, get in touch via the footer.
          </div>
        ) : canEdit ? (
          <div className="stack-16">
            <div className="notice is-success">
              You maintain this project. You can edit its page or release the
              claim from the edit screen.
            </div>
            <div className="cluster">
              <Link href={`${projectPath}/edit`} className="btn btn-primary">
                Edit project page
              </Link>
              <Link href={projectPath} className="btn btn-secondary">
                Back to project
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-strong panel" style={{ borderRadius: "var(--radius-xl)" }}>
            <div className="panel-steps">
              <div className={`step${userId ? " is-done" : ""}`}>
                <span className="step-num">{userId ? "✓" : "01"}</span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Sign in</h4>
                  <p>Create an account or sign in. Browsing never requires it; claiming does.</p>
                  {!userId && (
                    <div style={{ marginTop: 10 }}>
                      <Link
                        href={`/sign-in?redirect_url=${encodeURIComponent(claimPath)}`}
                        className="btn btn-primary btn-sm"
                      >
                        Sign in
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="step">
                <span className="step-num">02</span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Verify the repository</h4>
                  {userId ? (
                    <FileClaim
                      projectId={project.id}
                      projectPath={projectPath}
                      token={claimToken(project.id, userId)}
                      fileName={CLAIM_FILE_NAME}
                      fullName={`${project.owner}/${project.repo}`}
                      sourceName="Codeberg"
                    />
                  ) : (
                    <p className="body-s">Sign in first. Your token is tied to your account.</p>
                  )}
                </div>
              </div>
            </div>
            <p className="form-hint">
              Commit {CLAIM_FILE_NAME} to the default branch, or paste the token
              into the README. We verify the public repository contents without
              requesting access to your Codeberg account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
