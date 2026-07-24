"use client";

import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/* PostHog product analytics.

   Consent model (cookieless_mode: "on_reject", requires "Cookieless server
   hash mode" enabled in the PostHog project):
   - Accept  -> full capture with first-party cookies: a persistent person,
     session replay, autocapture, and custom events.
   - Decline or undecided -> cookieless capture: anonymous pageviews/events via
     a privacy-preserving server-side hash, no cookies or localStorage, no
     replay.

   So consenting visitors get normal cookie-based analytics; everyone else is
   measured anonymously without any device storage. The consent banner
   dispatches a "loss-consent-change" event and persists the choice under
   "loss-consent".

   Config comes from env so the public project key is never committed:
     NEXT_PUBLIC_POSTHOG_KEY   phc_… project key (blank disables PostHog)
     NEXT_PUBLIC_POSTHOG_HOST  ingestion host (defaults to EU cloud) */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const CONSENT_KEY = "loss-consent";
const INTERNAL_KEY = "loss-internal";

let didInit = false;

/* Team kill switch so our own visits never pollute analytics. Open any page
   with ?loss-internal=1 once per browser/device to flag it as internal
   (persisted in localStorage); ?loss-internal=0 clears the flag. While set,
   PostHog never initializes. Declining the consent banner is NOT enough for
   this, since cookieless_mode "on_reject" still captures anonymous events. */
function isInternalDevice(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get(INTERNAL_KEY);
    if (flag === "1") localStorage.setItem(INTERNAL_KEY, "1");
    if (flag === "0") localStorage.removeItem(INTERNAL_KEY);
    return localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false; /* storage blocked (private mode): treat as external */
  }
}

/* In cookieless_mode "on_reject", opt_in switches to normal cookie-based
   capture and opt_out switches to cookieless (anonymous) capture rather than
   capturing nothing. */
function applyConsent(granted: boolean) {
  if (granted) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

/* App Router is a SPA after first load, so pageviews are sent manually on
   route change. The initial pageview is sent from the init effect below. */
function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!didInit) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogAnalytics() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (isInternalDevice()) return;

    if (!didInit) {
      didInit = true;
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // sent manually (initial here, route changes above)
        capture_pageleave: true,
        autocapture: true,
        capture_performance: true, // web vitals + network timing
        enable_heatmaps: true,
        capture_exceptions: true, // client-side error tracking
        // Session replay records only in full (cookie) mode after consent;
        // inputs are masked so typed values (e.g. the newsletter email) are
        // never recorded.
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
        },
        // Cookieless for decliners and undecided visitors; cookies after Accept.
        cookieless_mode: "on_reject",
      });

      // Expose the instance for debugging and for lib/analytics captureEvent.
      (window as unknown as { posthog: typeof posthog }).posthog = posthog;

      let stored: string | null = null;
      try {
        stored = localStorage.getItem(CONSENT_KEY);
      } catch {
        /* storage blocked (private mode) */
      }
      // Accepted -> cookies; declined or undecided -> cookieless.
      applyConsent(stored === "granted");
      posthog.capture("$pageview"); // initial landing pageview
    }

    const onConsentChange = (event: Event) => {
      const choice = (event as CustomEvent<string>).detail;
      applyConsent(choice === "granted");
      if (choice === "granted") {
        posthog.capture("$pageview"); // the page they consented on, now with cookies
      }
    };

    window.addEventListener("loss-consent-change", onConsentChange as EventListener);
    return () =>
      window.removeEventListener("loss-consent-change", onConsentChange as EventListener);
  }, []);

  if (!POSTHOG_KEY) return null;

  return (
    <Suspense fallback={null}>
      <PostHogPageview />
    </Suspense>
  );
}
