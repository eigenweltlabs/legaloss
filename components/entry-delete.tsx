"use client";

import { useState, useTransition } from "react";
import { deleteComment, deleteReview } from "@/app/actions";

/** Two-step inline delete — no browser confirm() dialogs. */
export function EntryDelete({
  kind,
  id,
}: {
  kind: "comment" | "review";
  id: number;
}) {
  const [arming, setArming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!arming) {
    return (
      <button type="button" onClick={() => setArming(true)}>
        Delete
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (kind === "comment") await deleteComment(id);
          else await deleteReview(id);
          setArming(false);
        })
      }
      style={{ color: "var(--danger)" }}
    >
      {pending ? "Deleting…" : "Confirm delete?"}
    </button>
  );
}
