"use client";

import { useState } from "react";
import { captureEvent } from "@/lib/analytics";

type Status = "idle" | "pending" | "done" | "error";

/** Footer signup for the featured-projects newsletter. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "pending") return;
    setStatus("pending");
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Subscription failed. Try again later.");
        return;
      }
      setStatus("done");
      captureEvent("newsletter_subscribed");
    } catch {
      setStatus("error");
      setError("Subscription failed. Try again later.");
    }
  }

  if (status === "done") {
    return (
      <p className="newsletter-done">
        You&apos;re on the list. New featured projects, straight to your inbox.
      </p>
    );
  }

  return (
    <form className="newsletter" onSubmit={subscribe}>
      <label className="form-label" htmlFor="newsletter-email">
        New featured projects, by email
      </label>
      <div className="newsletter-row">
        <div className="field">
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="you@firm.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === "pending"}
        >
          {status === "pending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
