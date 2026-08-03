import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How LegalOSS handles analytics, accounts, and newsletter data.",
};

export default function PrivacyPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">Privacy</span>
          <h1 className="display-m">What we collect, plainly.</h1>
          <p className="body-l">
            LegalOSS is operated by Poensgen Technology UG
            (haftungsbeschränkt), Berlin — see the{" "}
            <Link href="/imprint" className="accent">
              imprint
            </Link>
            . Browsing the index needs no account and works with the cookie
            banner declined.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Analytics</h3>
          <p className="body">
            We use PostHog (EU cloud, hosted in Frankfurt) to understand how
            the index is used. If you accept the cookie banner, PostHog sets
            first-party cookies and may record sessions with all inputs
            masked. If you decline — or never answer — no analytics cookies
            are set and nothing is stored on your device; usage is measured
            through a short-lived, non-reversible server-side hash instead. IP
            addresses are discarded at ingestion. You can change your mind by
            clearing this site&apos;s data in your browser, which brings the
            banner back.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Accounts</h3>
          <p className="body">
            Sign-in is handled by Clerk. We store your Clerk user id, display
            name, avatar, and — if you connect GitHub for a maintainer claim —
            your public GitHub login. The claim flow reads only your public
            identity and repository permission level; it has no repository
            scopes. Deleting your account removes this mirror.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Newsletter</h3>
          <p className="body">
            The featured-projects newsletter runs on Brevo. Subscribing stores
            your email address there — as does creating an account, which adds
            your sign-up address to the same list. Every issue carries an
            unsubscribe link, unsubscribing removes you from the list, and
            signing up again will not put you back on it. Your address is used
            for nothing else.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Project data</h3>
          <p className="body">
            Everything shown about a project — stars, forks, issues, license,
            README, contributors — is public data fetched from the GitHub API
            and cached server-side. Nothing is scraped from private sources.
            Maintainers can have their project removed by contacting us.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Hosting</h3>
          <p className="body">
            The site runs on Google Cloud Run in europe-west1 (Belgium).
            Standard server logs (IP address, request path, timestamp) exist
            briefly for operations and abuse prevention.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Your rights</h3>
          <p className="body">
            Under the GDPR you can request access, correction, deletion, and
            portability of your data, and you can object to processing. Write
            to{" "}
            <a href="mailto:chris@eigenweltlabs.com" className="accent">
              chris@eigenweltlabs.com
            </a>{" "}
            and we&apos;ll sort it out. You can also complain to a supervisory
            authority; for Berlin that is the Berliner Beauftragte für
            Datenschutz und Informationsfreiheit.
          </p>
        </div>
      </div>
    </div>
  );
}
