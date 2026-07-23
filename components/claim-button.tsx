"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimProject, type ClaimResult } from "@/app/actions";
import { IconShield } from "@/components/icons";

export function ClaimButton({
  projectId,
  projectPath,
}: {
  projectId: number;
  projectPath: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [pending, startTransition] = useTransition();

  function claim() {
    setResult(null);
    startTransition(async () => {
      const r = await claimProject(projectId);
      setResult(r);
      if (r.ok) {
        setTimeout(() => router.push(projectPath), 1200);
      }
    });
  }

  return (
    <div className="stack-8">
      <button
        type="button"
        className="btn btn-primary"
        onClick={claim}
        disabled={pending}
      >
        <IconShield />
        {pending ? "Verifying with GitHub…" : "Verify ownership & claim"}
      </button>
      {result &&
        (result.ok ? (
          <div className="notice is-success">
            Ownership verified. This project is now yours — redirecting…
          </div>
        ) : (
          <div className="notice is-error">{result.error}</div>
        ))}
    </div>
  );
}
