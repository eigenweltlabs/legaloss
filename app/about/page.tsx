import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowRight } from "@/components/icons";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container">
      <div className="narrow stack-24">
        <div className="section-head">
          <span className="eyebrow">About</span>
          <h1 className="display-m">An index, not a listicle.</h1>
        </div>
        <p className="body-l">
          The Open Legal Index is a community-maintained registry of open-source
          software for the law — case management, document automation, court
          data, citation parsing, legal AI, and everything in between.
        </p>
        <p className="body">
          Three rules keep it honest. Every entry is a real GitHub repository,
          and its stats — stars, forks, activity, license — come straight from
          the source. Every repository can be indexed exactly once; anyone can
          add a project, no one can duplicate it. And a project's page belongs
          to whoever proves, through GitHub, that they control the repository —
          maintainers claim their work, carry the maintainer mark, and curate
          how it appears.
        </p>
        <p className="body">
          Reviews and discussion come from signed-in members. Browsing needs no
          account at all.
        </p>
        <p className="body">
          Built and hosted by{" "}
          <a href="https://eigenweltlabs.com" target="_blank" rel="noreferrer" className="accent">
            Eigenwelt Labs
          </a>
          , the Berlin lab for private legal AI. The index is where we keep an
          eye on the open ecosystem our customers build on.
        </p>
        <div className="cluster" style={{ paddingTop: 8 }}>
          <Link href="/projects" className="btn btn-primary">
            Browse the index
            <IconArrowRight />
          </Link>
          <Link href="/submit" className="btn btn-pill">
            Submit a project
          </Link>
        </div>
      </div>
    </div>
  );
}
