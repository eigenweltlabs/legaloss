"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { addComment } from "@/app/actions";

export function CommentComposer({
  projectId,
  signedIn,
}: {
  projectId: number;
  signedIn: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="notice" style={{ marginBottom: 22 }}>
        <span>
          <Link href="/sign-in" className="accent">
            Sign in
          </Link>{" "}
          to join the discussion.
        </span>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="glass composer"
      onSubmit={(e) => {
        e.preventDefault();
        const body = String(new FormData(e.currentTarget).get("body") ?? "");
        setError(null);
        startTransition(async () => {
          const result = await addComment({ projectId, body });
          if (!result.ok) setError(result.error);
          else formRef.current?.reset();
        });
      }}
    >
      <textarea
        className="textarea"
        name="body"
        placeholder="Share experience, ask a question, flag something…"
        maxLength={4000}
        required
      />
      <div className="composer-foot">
        {error ? (
          <span className="form-error" style={{ margin: 0 }}>
            {error}
          </span>
        ) : (
          <span />
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
