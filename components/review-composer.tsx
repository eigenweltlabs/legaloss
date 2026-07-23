"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { upsertReview } from "@/app/actions";
import { IconStar } from "@/components/icons";

export function ReviewComposer({
  projectId,
  signedIn,
  existing,
}: {
  projectId: number;
  signedIn: boolean;
  existing: { rating: number; title: string | null; body: string | null } | null;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="notice" style={{ marginBottom: 22 }}>
        <span>
          <Link href="/sign-in" className="accent">
            Sign in
          </Link>{" "}
          to leave a review.
        </span>
      </div>
    );
  }

  return (
    <form
      className="glass composer"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await upsertReview({
            projectId,
            rating,
            title: String(fd.get("title") ?? ""),
            body: String(fd.get("body") ?? ""),
          });
          if (!result.ok) setError(result.error);
          else setSaved(true);
        });
      }}
    >
      <div className="composer-head">
        <span className="form-label">
          {existing ? "Your review" : "Rate this project"}
        </span>
        <div
          className="rating-input"
          role="radiogroup"
          aria-label="Rating"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={(hovered || rating) >= n ? "is-on" : ""}
              onMouseEnter={() => setHovered(n)}
              onClick={() => setRating(n)}
            >
              <IconStar filled={(hovered || rating) >= n} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <input
          name="title"
          placeholder="Headline (optional)"
          maxLength={120}
          defaultValue={existing?.title ?? ""}
        />
      </div>
      <textarea
        className="textarea"
        name="body"
        placeholder="What did you use it for? What held up, what didn't? (optional)"
        maxLength={4000}
        defaultValue={existing?.body ?? ""}
      />
      <div className="composer-foot">
        {error ? (
          <span className="form-error" style={{ margin: 0 }}>
            {error}
          </span>
        ) : saved ? (
          <span className="form-hint" style={{ margin: 0, color: "#2E6B52" }}>
            Review saved.
          </span>
        ) : (
          <span className="form-hint" style={{ margin: 0 }}>
            One review per member — you can revise it anytime.
          </span>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || rating === 0}
        >
          {pending ? "Saving…" : existing ? "Update review" : "Publish review"}
        </button>
      </div>
    </form>
  );
}
