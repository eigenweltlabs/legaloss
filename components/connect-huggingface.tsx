"use client";

import { useState } from "react";
import Link from "next/link";
import { useReverification, useUser } from "@clerk/nextjs";
import { IconHuggingFace } from "@/components/icons";

/**
 * Connects Hugging Face as an external account on the signed-in Clerk user,
 * then sends the browser through Hugging Face's authorize screen and back to
 * returnTo. Mirrors ConnectGitHub.
 */
export function ConnectHuggingFace({ returnTo }: { returnTo: string }) {
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
        strategy: "oauth_huggingface" as Parameters<
          NonNullable<typeof user>["createExternalAccount"]
        >[0]["strategy"],
        redirectUrl: returnTo,
      });
      const url = res?.verification?.externalVerificationRedirectURL;
      if (url) {
        window.location.href = url.href;
      } else {
        setError(
          "Hugging Face connection could not be started. Try it from your account page instead.",
        );
        setBusy(false);
      }
    } catch (err) {
      const clerkMessage = (
        err as { errors?: { longMessage?: string; message?: string }[] }
      )?.errors?.[0];
      setError(
        clerkMessage?.longMessage ??
          clerkMessage?.message ??
          "Hugging Face connection failed to start. The Clerk instance may not have the Hugging Face social connection enabled yet (Dashboard → SSO connections → Hugging Face).",
      );
      setBusy(false);
    }
  }

  return (
    <div className="stack-8">
      <button type="button" className="btn btn-secondary" onClick={connect} disabled={busy}>
        <IconHuggingFace />
        {busy ? "Redirecting to Hugging Face…" : "Connect Hugging Face"}
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
