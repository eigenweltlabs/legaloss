"use client";

import { useState } from "react";
import Link from "next/link";
import { useReverification, useUser } from "@clerk/nextjs";
import { IconGitHub } from "@/components/icons";

/**
 * Connects GitHub as an external account on the signed-in Clerk user, then
 * sends the browser through GitHub's authorize screen and back to returnTo.
 */
export function ConnectGitHub({ returnTo }: { returnTo: string }) {
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createExternalAccount = useReverification(
    (params: Parameters<NonNullable<typeof user>["createExternalAccount"]>[0]) =>
      user!.createExternalAccount(params),
  );

  async function connect() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createExternalAccount({
        strategy: "oauth_github",
        redirectUrl: returnTo,
      });
      const url = res?.verification?.externalVerificationRedirectURL;
      if (url) {
        window.location.href = url.href;
      } else {
        setError(
          "GitHub connection could not be started. Try it from your account page instead.",
        );
        setBusy(false);
      }
    } catch {
      setError(
        "GitHub connection failed to start. The instance may not have the GitHub social connection enabled yet — see your account page.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="stack-8">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={connect}
        disabled={busy}
      >
        <IconGitHub />
        {busy ? "Redirecting to GitHub…" : "Connect GitHub"}
      </button>
      {error && (
        <p className="form-error">
          {error}{" "}
          <Link href="/account" className="accent">
            Open account settings →
          </Link>
        </p>
      )}
    </div>
  );
}
