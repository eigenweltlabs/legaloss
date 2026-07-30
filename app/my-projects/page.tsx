import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { listProjects } from "@/lib/projects";
import { currentGithubLogin } from "@/lib/maintainers";
import { ProjectCard } from "@/components/project-card";
import { IconShield, IconStar } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My projects",
  // A personal list has nothing to offer a crawler.
  robots: { index: false, follow: false },
};

type Tab = "maintained" | "starred";

function Tabs({ active }: { active: Tab }) {
  return (
    <nav className="admin-tabs" aria-label="My projects sections">
      <Link
        href="/my-projects"
        className={`glass-chip${active === "maintained" ? " is-active" : ""}`}
      >
        Maintained
      </Link>
      <Link
        href="/my-projects?tab=starred"
        className={`glass-chip${active === "starred" ? " is-active" : ""}`}
      >
        Starred
      </Link>
    </nav>
  );
}

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab: Tab = params.tab === "starred" ? "starred" : "maintained";
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container">
        <div className="narrow">
          <div className="section-head">
            <span className="eyebrow">Your list</span>
            <h1 className="display-m">My projects.</h1>
          </div>
          <div className="empty-state">
            <div className="es-icon">
              <IconStar />
            </div>
            <h4>Sign in to see your projects</h4>
            <p>
              Everything is kept per account: the projects you maintain here
              and the ones you have starred while browsing.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent("/my-projects")}`}
              className="btn btn-primary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { items } =
    tab === "starred"
      ? await listProjects({
          userId,
          starredByUserId: userId,
          sort: "recently-starred",
        })
      : await listProjects({
          userId,
          maintainedBy: { userId, githubLogin: await currentGithubLogin() },
          sort: "stars",
        });

  return (
    <div className="container">
      <div className="dir-head">
        <div>
          <h1 className="display-m">My projects.</h1>
          <p className="dir-sub">
            {tab === "maintained"
              ? "The projects you maintain on LegalOSS — claimed by you, or granted to your GitHub account by a claimant. Nobody else sees this page."
              : "Everything you have starred, most recent first. Stars are yours alone — they are separate from the project's GitHub stargazers, and nobody else sees this page."}
          </p>
        </div>
        <span className="meta-mono">
          {items.length} project{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Tabs active={tab} />

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} signedIn />
          ))}
        </div>
      ) : tab === "maintained" ? (
        <div className="empty-state">
          <div className="es-icon">
            <IconShield />
          </div>
          <h4>You don&apos;t maintain anything here yet</h4>
          <p>
            Claim a project you own from its page — the &ldquo;Claim this
            project&rdquo; button verifies control through GitHub — and it
            lands here, ready to edit.
          </p>
          <Link href="/" className="btn btn-primary">
            Find your project
          </Link>
        </div>
      ) : (
        <div className="empty-state">
          <div className="es-icon">
            <IconStar />
          </div>
          <h4>No stars yet</h4>
          <p>
            Hit the star on any project card or project page and it lands here.
            Useful for keeping a shortlist while you evaluate tools.
          </p>
          <Link href="/" className="btn btn-primary">
            Browse the index
          </Link>
        </div>
      )}
    </div>
  );
}
