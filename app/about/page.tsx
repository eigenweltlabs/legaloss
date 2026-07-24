import Link from "next/link";
import type { Metadata } from "next";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">About</span>
          <h1 className="display-m">How this works.</h1>
        </div>
        <p className="body-l">
          LegalOSS is a small index of open-source legal software. Every entry
          is a real GitHub repository, its stats come straight from GitHub, and
          each repository can be listed exactly once. Browsing needs no
          account.
        </p>

        <div className="stack-8">
          <h3 style={{ fontSize: 16 }}>Claiming a project</h3>
          <p className="body">
            A project page belongs to whoever can prove they control the
            repository. Claiming takes about a minute:
          </p>
          <ol className="body" style={{ margin: 0, paddingLeft: 22 }}>
            <li>
              Sign in, open the project page, and hit &quot;Claim this
              project&quot;.
            </li>
            <li>
              Connect the GitHub account that has admin rights on the
              repository. We only read your public identity, no repository
              scopes.
            </li>
            <li>
              Verify. We ask GitHub whether your account holds admin permission
              on the repo. One click, checked server-side.
            </li>
          </ol>
          <p className="body">
            Verified maintainers get the maintainer mark and can edit the
            project&apos;s name, tagline, website, and categories. Everyone
            else can star, review, and comment.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 16 }}>Stay in the loop</h3>
          <p className="body">
            Every few weeks we send one email listing the newly featured
            open-source legal projects. No noise, unsubscribe any time.
          </p>
          <NewsletterForm />
        </div>

        <div className="cluster" style={{ paddingTop: 8 }}>
          <Link href="/" className="btn btn-primary">
            Browse the index
          </Link>
          <Link href="/submit" className="btn btn-secondary">
            Submit a project
          </Link>
        </div>
      </div>
    </div>
  );
}
