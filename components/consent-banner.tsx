"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "loss-consent";
const CHANGE_EVENT = "loss-consent-change";

type Choice = "granted" | "denied";

/* Remembers the choice for this tab when localStorage is blocked (private
   mode), so the banner still dismisses. */
let sessionChoice: Choice | null = null;

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getSnapshot(): string | null {
  if (sessionChoice) return sessionChoice;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/* During SSR pretend a choice exists so the banner only appears client-side. */
function getServerSnapshot(): string {
  return "pending-hydration";
}

export function ConsentBanner() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = stored !== "granted" && stored !== "denied" && stored !== "pending-hydration";

  const decide = (choice: Choice) => {
    sessionChoice = choice;
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* private mode: sessionChoice covers this tab */
    }
    // PostHog (and this banner's store) react to the same event.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: choice }));
  };

  if (!visible) return null;

  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="consent-card glass-strong">
        <span className="eyebrow">Cookies</span>
        <p className="consent-body">
          We use cookies to understand how the index is used.
        </p>
        <div className="consent-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => decide("denied")}>
            Decline
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => decide("granted")}>
            Accept
          </button>
        </div>
        <Link href="/privacy" className="consent-link">
          Privacy policy →
        </Link>
      </div>
    </div>
  );
}
