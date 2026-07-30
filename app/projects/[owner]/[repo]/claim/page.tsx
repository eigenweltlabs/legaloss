import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProject } from "@/lib/projects";
import { canEditProject } from "@/lib/maintainers";
import { hasGithubConnection } from "@/lib/github-ownership";
import { CLAIM_FILE_NAME, claimToken } from "@/lib/claim-file";
import { ClaimButton } from "@/components/claim-button";
import { ConnectGitHub } from "@/components/connect-github";
import { FileClaim } from "@/components/file-claim";
import { IconCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Claim project" };

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const project = await getProject(owner, repo);
  if (!project) notFound();

  const { userId } = await auth();
  const projectPath = `/projects/${project.owner}/${project.repo}`;
  const claimPath = `${projectPath}/claim`;

  // Claimant or a maintainer the claimant added — either way, editing is open.
  const canEdit = await canEditProject(project, userId);
  const alreadyClaimedByOther = project.claimedById !== null && !canEdit;
  const claimedByMe = canEdit;
  const githubConnected = userId ? await hasGithubConnection(userId) : false;

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
            Claiming proves through GitHub that you control this repository.
            Claimants get the maintainer mark and editing rights over this page.
          </p>
        </div>

        {alreadyClaimedByOther ? (
          <div className="notice is-warning">
            This project has already been claimed by its maintainer. If you
            believe that&apos;s wrong, get in touch via the footer.
          </div>
        ) : claimedByMe ? (
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
                <span className="step-num">{userId ? <IconCheck /> : "01"}</span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Sign in</h4>
                  <p>Create an account or sign in. Browsing never requires it, claiming does.</p>
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
              <div className={`step${userId && githubConnected ? " is-done" : ""}`}>
                <span className="step-num">
                  {userId && githubConnected ? <IconCheck /> : "02"}
                </span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Connect GitHub</h4>
                  <p>
                    Link the GitHub account that has admin rights on{" "}
                    <span className="mono" style={{ fontSize: 12 }}>
                      {project.owner}/{project.repo}
                    </span>
                    . We only read your public identity, no repo scopes.
                  </p>
                  {userId && !githubConnected && (
                    <div style={{ marginTop: 10 }}>
                      <ConnectGitHub returnTo={claimPath} />
                    </div>
                  )}
                </div>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Verify ownership</h4>
                  <p>
                    We ask GitHub whether your account holds admin permission on
                    the repository. One click, verified server-side.
                  </p>
                  {userId && githubConnected && (
                    <div style={{ marginTop: 10 }}>
                      <ClaimButton projectId={project.id} projectPath={projectPath} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="form-hint">
              Works for personal repositories and organization repositories where
              you hold admin permission. Public repositories only.
            </p>

            <details className="claim-alt">
              <summary>Rather not connect GitHub? Verify with a file instead</summary>
              <div className="claim-alt-body">
                {userId ? (
                  <FileClaim
                    projectId={project.id}
                    projectPath={projectPath}
                    token={claimToken(project.id, userId)}
                    fileName={CLAIM_FILE_NAME}
                    fullName={`${project.owner}/${project.repo}`}
                    sourceName="GitHub"
                  />
                ) : (
                  <p className="body-s">
                    Sign in first — the token below is tied to your account.
                  </p>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
