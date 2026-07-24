"use client";

import { useEffect, useState } from "react";
import { NewsletterForm } from "@/components/newsletter-form";

const DISMISSED_KEY = "loss-nl-dismissed";
const CONSENT_KEY = "loss-consent";
const CONSENT_CHANGE_EVENT = "loss-consent-change";
const SHOW_DELAY_MS = 4000;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** First-visit newsletter invite, a few seconds after landing. It waits for
    the cookie banner to be answered before arming its timer — on phones both
    cards are full-width at the bottom and would otherwise stack. */
export function NewsletterModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readStorage(DISMISSED_KEY) === "1") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      timer = setTimeout(() => {
        if (readStorage(DISMISSED_KEY) !== "1") setVisible(true);
      }, SHOW_DELAY_MS);
    };
    const consent = readStorage(CONSENT_KEY);
    if (consent === "granted" || consent === "denied") arm();
    else window.addEventListener(CONSENT_CHANGE_EVENT, arm, { once: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(CONSENT_CHANGE_EVENT, arm);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private mode: component state still hides it for this tab */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="nl-modal glass-strong" role="dialog" aria-label="Newsletter signup">
      <button type="button" className="nl-modal-close" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
      <span className="eyebrow">Newsletter</span>
      <h4 className="nl-modal-title">New legal OSS, every few weeks.</h4>
      <p className="nl-modal-body">
        One email with the newly featured open-source legal projects. No noise,
        unsubscribe any time.
      </p>
      <NewsletterForm />
      <button type="button" className="nl-modal-no" onClick={dismiss}>
        No thanks
      </button>
    </div>
  );
}
