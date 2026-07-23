"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewRepo, submitProject, type RepoPreview } from "@/app/actions";
import { formatCount } from "@/lib/format";
import { IconCheck, IconGitHub, IconSearch, IconStar } from "@/components/icons";

type Cat = { slug: string; name: string };

export function SubmitForm({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<RepoPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tagline, setTagline] = useState("");
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

  function toggleCat(slug: string) {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 4
          ? [...prev, slug]
          : prev,
    );
  }

  function submit() {
    setError(null);
    startSubmitting(async () => {
      const result = await submitProject({
        url,
        tagline: tagline || undefined,
        categorySlugs: selected,
      });
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
        <div className="cluster" style={{ flexWrap: "nowrap" }}>
          <div className="field" style={{ flex: 1 }}>
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
            <label className="form-label">
              Categories <span className="form-hint" style={{ display: "inline" }}>(1–4)</span>
            </label>
            <div className="cluster">
              {categories.map((c) => {
                const checked = selected.includes(c.slug);
                return (
                  <label
                    key={c.slug}
                    className={`choice-chip${checked ? " is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCat(c.slug)}
                    />
                    {checked && <IconCheck style={{ width: 13, height: 13 }} />}
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="tagline">
              Tagline <span className="form-hint" style={{ display: "inline" }}>(optional)</span>
            </label>
            <div className="field">
              <input
                id="tagline"
                type="text"
                maxLength={180}
                placeholder="One sentence on what it does — defaults to the GitHub description"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
          </div>

          <div className="row-between">
            <p className="form-hint" style={{ margin: 0 }}>
              Stats refresh automatically from GitHub after indexing.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={submit}
              disabled={submitting || selected.length === 0}
            >
              {submitting ? "Adding…" : "Add to the index"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
