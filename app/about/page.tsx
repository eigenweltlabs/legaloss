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
            repository. There are two ways to prove it, both about a minute.
            Sign in, open the project page, hit &quot;Claim this project&quot;,
            and pick one.
          </p>

          <h4 style={{ fontSize: 13.5, fontWeight: 600 }}>
            Connect the account
          </h4>
          <ol className="body" style={{ margin: 0, paddingLeft: 22 }}>
            <li>
              Link the GitHub or Hugging Face account behind the repository.
            </li>
            <li>
              Verify. We ask the source whether your account controls the repo —
              GitHub admin permission, or a matching Hugging Face identity.
              One click, checked server-side.
            </li>
          </ol>
          <p className="body">
            For GitHub and for personal Hugging Face repos this reads your
            public identity only, no repository scopes.
          </p>

          <h4 style={{ fontSize: 13.5, fontWeight: 600 }}>
            Or publish a token — no account access at all
          </h4>
          <ol className="body" style={{ margin: 0, paddingLeft: 22 }}>
            <li>
              The claim page shows you a token. It is tied to your account and
              that one project, so nobody else&apos;s token will work and yours
              is worthless anywhere else.
            </li>
            <li>
              Commit it to a file called{" "}
              <span className="mono">legaloss-verify.txt</span> at the root of
              the repository, on the default branch. Pasting the same line
              anywhere in the README works just as well.
            </li>
            <li>
              Come back and verify. We fetch the file the way any visitor would
              — anonymously, over the public URL. Delete it afterwards if you
              like; the claim stays.
            </li>
          </ol>
          <p className="body">
            This route exists because Hugging Face has no read-only
            &quot;which organizations am I in&quot; scope: the only scope that
            proves membership also grants read access to an account&apos;s
            private repositories. Publishing a token in a repository you already
            control proves the same thing and grants us nothing.
          </p>
          <p className="body">
            If neither route fits — a protected default branch, an organization
            that blocks OAuth apps, a handover between maintainers — email{" "}
            <a href="mailto:chris@eigenweltlabs.com" className="accent">
              chris@eigenweltlabs.com
            </a>{" "}
            and we&apos;ll verify it by hand.
          </p>

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
