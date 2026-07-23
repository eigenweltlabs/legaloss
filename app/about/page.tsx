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
        <p className="body-l prose">
          LegalOSS is a community-maintained registry of open-source software
          for the law — case management, document automation, court data,
          citation parsing, legal AI, and everything in between.
        </p>
        <p className="body prose">
          Three rules keep it honest. Every entry is a real GitHub repository,
          and its stats — stars, forks, activity, license — come straight from
          the source. Every repository can be indexed exactly once; anyone can
          add a project, no one can duplicate it. And a project's page belongs
          to whoever proves, through GitHub, that they control the repository —
          maintainers claim their work, carry the maintainer mark, and curate
          the tagline and categories.
        </p>
        <p className="body prose">
          Claiming takes a minute: sign in, connect the GitHub account that
          holds admin rights on the repository, and verify. We only read your
          public identity — no repository scopes.
        </p>
        <p className="body prose">
          Reviews and discussion come from signed-in members. Browsing needs no
          account at all.
        </p>
        <div className="cluster" style={{ paddingTop: 8 }}>
          <Link href="/" className="btn btn-primary">
            Browse the index
            <IconArrowRight />
          </Link>
          <Link href="/submit" className="btn btn-secondary">
            Submit a project
          </Link>
        </div>
      </div>
    </div>
  );
}
