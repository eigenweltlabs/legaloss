"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStar } from "@/app/actions";
import { IconStar } from "@/components/icons";

/** Compact star toggle for list cards; sits above the card's stretched link. */
export function CardStar({
  projectId,
  initialStarred,
  initialCount,
  signedIn,
}: {
  projectId: number;
  initialStarred: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    const next = !starred;
    setStarred(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleStar(projectId);
      if (!result.ok) {
        setStarred(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      className={`pc-star${starred ? " is-on" : ""}`}
      onClick={onClick}
      aria-pressed={starred}
      title={
        signedIn
          ? starred
            ? "Remove your star"
            : "Star this project"
          : "Sign in to star"
      }
    >
      <IconStar filled={starred} />
      {count}
    </button>
  );
}
