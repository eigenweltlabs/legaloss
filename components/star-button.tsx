"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleStar } from "@/app/actions";
import { IconStar } from "@/components/icons";

export function StarButton({
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
  const [pending, startTransition] = useTransition();

  function onClick() {
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
        // Roll back the optimistic flip.
        setStarred(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      className={starred ? "btn btn-primary" : "btn btn-secondary"}
      onClick={onClick}
      disabled={pending}
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
      {starred ? "Starred" : "Star"}
      <span className="numeral">{count}</span>
    </button>
  );
}
