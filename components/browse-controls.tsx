"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IconSearch } from "@/components/icons";

const SORTS = [
  { value: "gh-stars", label: "GitHub stars" },
  { value: "site-stars", label: "Community stars" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Recently added" },
  { value: "active", label: "Recently active" },
];

export function BrowseControls() {
  const router = useRouter();
  const params = useSearchParams();

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="browse-bar glass">
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          update({ q: String(q ?? "") });
        }}
        role="search"
      >
        <IconSearch />
        <input
          type="search"
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search the index…"
          aria-label="Search the index"
        />
      </form>
      <label className="meta-mono" htmlFor="sort" style={{ marginLeft: "auto" }}>
        Sort
      </label>
      <select
        id="sort"
        className="select"
        value={params.get("sort") ?? "gh-stars"}
        onChange={(e) => update({ sort: e.target.value })}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
