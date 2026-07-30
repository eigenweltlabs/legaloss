import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getHfProject } from "@/lib/projects";
import { canEditProject } from "@/lib/maintainers";
import { hasHfConnection } from "@/lib/huggingface-ownership";
import { isHfOrganization } from "@/lib/huggingface";
import { CLAIM_FILE_NAME, claimToken } from "@/lib/claim-file";
import { projectHref } from "@/lib/sources";
import { ClaimButton } from "@/components/claim-button";
import { ConnectHuggingFace } from "@/components/connect-huggingface";
import { FileClaim } from "@/components/file-claim";
import { IconCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Claim project" };

export default async function HfClaimPage({
  params,
}: {
  params: Promise<{ type: string; owner: string; repo: string }>;
}) {
  const { type, owner, repo } = await params;
  const project = await getHfProject(type, owner, repo);
  if (!project) notFound();

  const { userId } = await auth();
  const projectPath = projectHref(project);
  const claimPath = `${projectPath}/claim`;

  // Claimant or a maintainer the claimant added — either way, editing is open.
  const canEdit = await canEditProject(project, userId);
  const alreadyClaimedByOther = project.claimedById !== null && !canEdit;
  const claimedByMe = canEdit;
  const hfConnected = userId ? await hasHfConnection(userId) : false;
  // Org-owned repos are the only ones that cost a repository scope; personal
  // ones verify off the identity endpoint alone.
  const ownerIsOrg = await isHfOrganization(project.owner);

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
            Claiming proves through Hugging Face that you control this
            repository. Claimants get the maintainer mark and editing rights over
            this page.
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
              <div className={`step${userId && hfConnected ? " is-done" : ""}`}>
                <span className="step-num">
                  {userId && hfConnected ? <IconCheck /> : "02"}
                </span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Connect Hugging Face</h4>
                  <p>
                    Link the Hugging Face account that owns{" "}
                    <span className="mono" style={{ fontSize: 12 }}>
                      {project.owner}/{project.repo}
                    </span>
                    .{" "}
                    {ownerIsOrg
                      ? "Hugging Face has no organization-only scope, so confirming membership asks for repository read access. We only ever call the identity endpoint — and the file method below needs no access at all."
                      : "We only read your public identity."}
                  </p>
                  {userId && !hfConnected && (
                    <div style={{ marginTop: 10 }}>
                      <ConnectHuggingFace
                        returnTo={claimPath}
                        requestOrgAccess={ownerIsOrg}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <div className="step-body" style={{ flex: 1 }}>
                  <h4>Verify ownership</h4>
                  <p>
                    We ask Hugging Face whether your account owns the repository,
                    directly or through its organization. One click, verified
                    server-side.
                  </p>
                  {userId && hfConnected && (
                    <div style={{ marginTop: 10 }}>
                      <ClaimButton
                        projectId={project.id}
                        projectPath={projectPath}
                        sourceName="Hugging Face"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="form-hint">
              Works for repositories you own personally and those under an
              organization you belong to. Public repositories only.
            </p>

            <details className="claim-alt">
              <summary>
                Rather not connect Hugging Face? Verify with a file instead
              </summary>
              <div className="claim-alt-body">
                {userId ? (
                  <FileClaim
                    projectId={project.id}
                    projectPath={projectPath}
                    token={claimToken(project.id, userId)}
                    fileName={CLAIM_FILE_NAME}
                    fullName={`${project.owner}/${project.repo}`}
                    sourceName="Hugging Face"
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
