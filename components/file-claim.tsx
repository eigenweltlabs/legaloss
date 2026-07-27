"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimProjectByFile, type ClaimResult } from "@/app/actions";
import { IconCheck, IconShield } from "@/components/icons";

/**
 * The no-OAuth claim path: publish a personal token in the repository, we read
 * it back anonymously. Rendered as the fallback under the connect-account flow
 * on both claim pages.
 */
export function FileClaim({
  projectId,
  projectPath,
  token,
  fileName,
  fullName,
  sourceName,
}: {
  projectId: number;
  projectPath: string;
  /** This user's token for this project; safe to display, useless to others. */
  token: string;
  fileName: string;
  fullName: string;
  sourceName: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission): the token
      // is on screen and selectable, so there is nothing to recover from.
    }
  }

  function verify() {
    setResult(null);
    startTransition(async () => {
      const r = await claimProjectByFile(projectId);
      setResult(r);
      if (r.ok) setTimeout(() => router.push(projectPath), 1200);
    });
  }

  return (
    <div className="stack-16">
      <ol className="claim-alt-steps">
        <li>
          Add a file called <code>{fileName}</code> to the root of{" "}
          <span className="mono">{fullName}</span> on its default branch,
          containing the line below. Pasting the same line anywhere in the
          README works too.
        </li>
        <li>Come back here and verify. You can delete the file afterwards.</li>
      </ol>

      <div className="token-box">
        <code>{token}</code>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? <IconCheck /> : null}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="form-hint">
        This token belongs to your account only — publishing someone else&apos;s
        proves nothing. {sourceName} never sees your credentials here: the file
        is read the same way any visitor would read it.
      </p>

      <div className="stack-8">
        <button
          type="button"
          className="btn btn-primary"
          onClick={verify}
          disabled={pending}
        >
          <IconShield />
          {pending ? "Checking the repository…" : "Check the repository & claim"}
        </button>
        {result &&
          (result.ok ? (
            <div className="notice is-success">
              Token found. This project is now yours. Redirecting…
            </div>
          ) : (
            <div className="notice is-error">{result.error}</div>
          ))}
      </div>
    </div>
  );
}
