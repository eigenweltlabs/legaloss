import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { listProjects } from "@/lib/projects";
import { ProjectCard } from "@/components/project-card";
import { IconStar } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Starred",
  // A personal list has nothing to offer a crawler.
  robots: { index: false, follow: false },
};

export default async function StarredPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container">
        <div className="narrow">
          <div className="section-head">
            <span className="eyebrow">Your list</span>
            <h1 className="display-m">Starred projects.</h1>
          </div>
          <div className="empty-state">
            <div className="es-icon">
              <IconStar />
            </div>
            <h4>Sign in to see your stars</h4>
            <p>
              Stars are kept per account. Sign in and everything you star while
              browsing collects here.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent("/starred")}`}
              className="btn btn-primary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = await listProjects({
    userId,
    starredByUserId: userId,
    sort: "recently-starred",
  });

  return (
    <div className="container">
      <div className="dir-head">
        <div>
          <h1 className="display-m">Starred projects.</h1>
          <p className="dir-sub">
            Everything you have starred, most recent first. Stars are yours
            alone — they are separate from the project&apos;s GitHub stargazers,
            and nobody else sees this page.
          </p>
        </div>
        <span className="meta-mono">
          {items.length} project{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} signedIn />
          ))}
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
