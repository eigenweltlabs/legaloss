"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewRepo, submitProject, type RepoPreview } from "@/app/actions";
import { formatCount } from "@/lib/format";
import { IconCheck, IconGitHub, IconSearch, IconStar } from "@/components/icons";

export function SubmitForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [preview, setPreview] = useState<RepoPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  function check() {
    setError(null);
    setExistingPath(null);
    setPreview(null);
    startChecking(async () => {
      const result = await previewRepo(url);
      if (result.ok) {
        setPreview(result);
      } else {
        setError(result.error);
        setExistingPath(result.existingPath ?? null);
      }
    });
  }

  function submit() {
    setError(null);
    startSubmitting(async () => {
      const result = await submitProject({ url, websiteUrl: websiteUrl || "" });
      if (result.ok) {
        router.push(result.path);
      } else {
        setError(result.error);
        setExistingPath(result.existingPath ?? null);
      }
    });
  }

  return (
    <div className="stack-24">
      <div>
        <label className="form-label" htmlFor="repo-url">
          GitHub repository
        </label>
        <div className="repo-check-row">
          <div className="field">
            <IconGitHub />
            <input
              id="repo-url"
              type="text"
              placeholder="github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  check();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={check}
            disabled={checking || url.trim().length === 0}
          >
            <IconSearch />
            {checking ? "Checking…" : "Check"}
          </button>
        </div>
        {error && (
          <p className="form-error">
            {error}{" "}
            {existingPath && (
              <Link href={existingPath} className="accent">
                View its page →
              </Link>
            )}
          </p>
        )}
      </div>

      {preview && (
        <>
          <div className="glass panel" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="row-between">
              <div className="stack-4" style={{ minWidth: 0 }}>
                <div className="cluster">
                  <strong style={{ fontSize: 17, letterSpacing: "-0.03em" }}>
                    {preview.fullName}
                  </strong>
                  <span className="badge badge-success">
                    <IconCheck />
                    Found on GitHub
                  </span>
                  {preview.archived && (
                    <span className="status-pill is-archived">Archived</span>
                  )}
                </div>
                {preview.description && (
                  <p className="body-s" style={{ maxWidth: 460 }}>
                    {preview.description}
                  </p>
                )}
              </div>
              <div className="cluster mono" style={{ fontSize: 12, color: "var(--muted-2)" }}>
                <span className="cluster" style={{ gap: 4 }}>
                  <IconStar filled style={{ width: 13, height: 13 }} />
                  {formatCount(preview.stars)}
                </span>
                {preview.language && <span>{preview.language}</span>}
                {preview.licenseSpdx && <span>{preview.licenseSpdx}</span>}
              </div>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="submit-website">
              Website <span style={{ color: "var(--ink-500)", fontWeight: 400 }}>(optional)</span>
            </label>
            <div className="field">
              <input
                id="submit-website"
                type="url"
                maxLength={300}
                placeholder="https://…"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <p className="form-hint">
              The project&apos;s own site or docs, shown on its page.
            </p>
          </div>

          <div className="row-between">
            <p className="form-hint" style={{ margin: 0, maxWidth: 380 }}>
              Stats stay live from GitHub. Tagline and categories are curated by
              the maintainer once they claim the page.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Adding…" : "Add to the index"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
