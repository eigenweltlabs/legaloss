"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { releaseClaim, updateProject } from "@/app/actions";
import { IconCheck } from "@/components/icons";

type Cat = { slug: string; name: string };

export function EditForm({
  projectId,
  projectPath,
  categories,
  initial,
}: {
  projectId: number;
  projectPath: string;
  categories: Cat[];
  initial: {
    name: string;
    tagline: string;
    websiteUrl: string;
    categorySlugs: string[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);
  const [selected, setSelected] = useState<string[]>(initial.categorySlugs);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [releasing, setReleasing] = useState(false);
  const [releasePending, startRelease] = useTransition();

  function toggleCat(slug: string) {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 4
          ? [...prev, slug]
          : prev,
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProject({
        projectId,
        name,
        tagline: tagline || undefined,
        websiteUrl: websiteUrl || "",
        categorySlugs: selected,
      });
      if (result.ok) router.push(result.path);
      else setError(result.error);
    });
  }

  return (
    <div className="stack-24">
      <div>
        <label className="form-label" htmlFor="name">
          Display name
        </label>
        <div className="field">
          <input
            id="name"
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="tagline">
          Tagline
        </label>
        <div className="field">
          <input
            id="tagline"
            type="text"
            maxLength={180}
            placeholder="One sentence on what it does"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <p className="form-hint">
          Shown instead of the GitHub description across the index.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor="website">
          Website
        </label>
        <div className="field">
          <input
            id="website"
            type="url"
            maxLength={300}
            placeholder="https://…"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="form-label">Categories (1–4)</label>
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

      {error && <div className="notice is-error">{error}</div>}

      <div className="row-between">
        {!releasing ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setReleasing(true)}
          >
            Release claim
          </button>
        ) : (
          <span className="cluster">
            <span className="body-s">Give up maintainer rights?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={releasePending}
              onClick={() =>
                startRelease(async () => {
                  const r = await releaseClaim(projectId);
                  if (r.ok) router.push(projectPath);
                })
              }
            >
              {releasePending ? "Releasing…" : "Yes, release"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setReleasing(false)}
            >
              Keep it
            </button>
          </span>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={pending || selected.length === 0 || name.trim().length === 0}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
