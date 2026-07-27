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
export function ConnectHuggingFace({
  returnTo,
  requestOrgAccess = false,
}: {
  returnTo: string;
  /**
   * Only for organization-owned repos. Hugging Face has no organization-only
   * scope, so proving org membership costs `read-repos` — which also grants
   * read access to private repos. Personal claims never ask for it.
   */
  requestOrgAccess?: boolean;
}) {
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
        // read-repos makes the user's organizations (and their role) appear in
        // whoami-v2, which is the only way to verify an org-owned repo. It also
        // grants read access to private repos, so it is requested only when the
        // repo being claimed actually belongs to an organization.
        ...(requestOrgAccess ? { additionalScopes: ["read-repos"] } : {}),
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
