"use client";

import { useState, useTransition } from "react";
import { toggleFeatured } from "@/app/actions";
import { IconStar } from "@/components/icons";

/** Admin-only control; the server action re-checks admin rights. */
export function FeatureToggle({
  projectId,
  initialFeatured,
}: {
  projectId: number;
  initialFeatured: boolean;
}) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm ${featured ? "btn-primary" : "btn-secondary"}`}
        disabled={pending}
        title={
          featured
            ? "Remove from the homepage rotator"
            : "Show in the homepage rotator and the next newsletter"
        }
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleFeatured(projectId);
            if (result.ok) setFeatured(result.featured);
            else setError(result.error);
          });
        }}
      >
        <IconStar filled={featured} />
        {pending ? "Saving…" : featured ? "Featured" : "Feature"}
      </button>
      {error && <span className="form-error">{error}</span>}
    </>
  );
}
