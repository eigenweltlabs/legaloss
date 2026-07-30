"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StarRow } from "@/lib/projects";
import { projectHref, sourceLabel } from "@/lib/sources";
import { IconChevronDown, IconSearch, IconStar } from "@/components/icons";

type View = "projects" | "members" | "activity";

const VIEWS: { value: View; label: string }[] = [
  { value: "projects", label: "By project" },
  { value: "members", label: "By member" },
  { value: "activity", label: "Activity" },
];

/** Sort options per view; the first entry is the view's default. */
const SORTS: Record<View, { value: string; label: string }[]> = {
  projects: [
    { value: "stars", label: "Most stars" },
    { value: "recent", label: "Recently starred" },
    { value: "name", label: "Project name" },
  ],
  members: [
    { value: "stars", label: "Most stars cast" },
    { value: "recent", label: "Recently active" },
    { value: "name", label: "Member name" },
  ],
  activity: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ],
};

const ACTIVITY_PAGE = 100;

function memberLabel(r: StarRow): string {
  return r.userName ?? r.userUsername ?? r.userId;
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function Avatar({ row }: { row: StarRow }) {
  const label = memberLabel(row);
  return (
    <span className="avatar is-sm" aria-hidden>
      {row.userImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.userImage} alt="" />
      ) : (
        label.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function ExpandButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`admin-expand${open ? " is-open" : ""}`}
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
    >
      <IconChevronDown />
    </button>
  );
}

/**
 * Star activity explorer: one dataset, three cuts. "By project" answers what
 * is being endorsed, "By member" answers who is endorsing, "Activity" is the
 * raw chronological log. Search and the source filter apply to individual
 * stars, so grouped counts always agree with the log view.
 */
export function AdminStars({ rows }: { rows: StarRow[] }) {
  const [view, setView] = useState<View>("projects");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState(SORTS.projects[0].value);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activityShown, setActivityShown] = useState(ACTIVITY_PAGE);

  function switchView(v: View) {
    setView(v);
    setSort(SORTS[v][0].value);
    setExpanded(new Set());
    setActivityShown(ACTIVITY_PAGE);
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (source && r.source !== source) return false;
      if (!needle) return true;
      return [
        `${r.owner}/${r.repo}`,
        r.name,
        r.userName ?? "",
        r.userUsername ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, source]);

  const projectGroups = useMemo(() => {
    const byProject = new Map<
      number,
      { row: StarRow; stars: StarRow[]; last: Date }
    >();
    for (const r of filtered) {
      const g = byProject.get(r.projectId) ?? {
        row: r,
        stars: [],
        last: r.createdAt,
      };
      g.stars.push(r);
      if (r.createdAt > g.last) g.last = r.createdAt;
      byProject.set(r.projectId, g);
    }
    const groups = [...byProject.values()];
    if (sort === "name") {
      groups.sort((a, b) =>
        `${a.row.owner}/${a.row.repo}`.localeCompare(`${b.row.owner}/${b.row.repo}`),
      );
    } else if (sort === "recent") {
      groups.sort((a, b) => b.last.getTime() - a.last.getTime());
    } else {
      groups.sort(
        (a, b) => b.stars.length - a.stars.length || b.last.getTime() - a.last.getTime(),
      );
    }
    return groups;
  }, [filtered, sort]);

  const memberGroups = useMemo(() => {
    const byMember = new Map<
      string,
      { row: StarRow; stars: StarRow[]; last: Date }
    >();
    for (const r of filtered) {
      const g = byMember.get(r.userId) ?? {
        row: r,
        stars: [],
        last: r.createdAt,
      };
      g.stars.push(r);
      if (r.createdAt > g.last) g.last = r.createdAt;
      byMember.set(r.userId, g);
    }
    const groups = [...byMember.values()];
    if (sort === "name") {
      groups.sort((a, b) => memberLabel(a.row).localeCompare(memberLabel(b.row)));
    } else if (sort === "recent") {
      groups.sort((a, b) => b.last.getTime() - a.last.getTime());
    } else {
      groups.sort(
        (a, b) => b.stars.length - a.stars.length || b.last.getTime() - a.last.getTime(),
      );
    }
    return groups;
  }, [filtered, sort]);

  const activity = useMemo(() => {
    // rows arrive newest first from the server.
    return sort === "oldest" ? [...filtered].reverse() : filtered;
  }, [filtered, sort]);

  const hasFilter = query.trim() !== "" || source !== "";

  return (
    <div className="stack-24">
      <div className="admin-toolbar glass">
        <div className="seg" role="group" aria-label="Group stars by">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              className={`glass-chip${view === v.value ? " is-active" : ""}`}
              aria-pressed={view === v.value}
              onClick={() => switchView(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="field" role="search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by project or member…"
            aria-label="Filter stars by project or member"
          />
        </div>
        <select
          className="select"
          aria-label="Filter by source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">All sources</option>
          <option value="github">GitHub</option>
          <option value="huggingface">Hugging Face</option>
        </select>
        <select
          className="select"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS[view].map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">
            <IconStar />
          </div>
          <h4>{hasFilter ? "Nothing matches" : "No stars yet"}</h4>
          <p>
            {hasFilter
              ? "No star matches these filters. Clear the search or widen the source filter."
              : "Nobody has starred a project. Once they do, every star shows up here with the member who cast it."}
          </p>
        </div>
      ) : view === "projects" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Source</th>
                <th className="is-num">Stars</th>
                <th>Last starred</th>
                <th aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {projectGroups.map((g) => {
                const key = `p${g.row.projectId}`;
                const open = expanded.has(key);
                return (
                  <FragmentRows
                    key={key}
                    open={open}
                    colSpan={5}
                    main={
                      <>
                        <td>
                          <Link href={projectHref(g.row)} className="mono">
                            {g.row.owner}/{g.row.repo}
                          </Link>
                        </td>
                        <td>
                          <span className="badge badge-neutral">
                            {sourceLabel(g.row.source)}
                          </span>
                        </td>
                        <td className="is-num">
                          <span className="badge badge-accent" title="Community stars">
                            <IconStar filled />
                            {g.stars.length}
                          </span>
                        </td>
                        <td className="is-date">{day(g.last)}</td>
                        <td className="is-actions">
                          <ExpandButton
                            open={open}
                            onClick={() => toggle(key)}
                            label={`Show who starred ${g.row.owner}/${g.row.repo}`}
                          />
                        </td>
                      </>
                    }
                    detail={
                      <ul className="admin-sublist">
                        {[...g.stars]
                          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                          .map((s) => (
                            <li key={s.userId}>
                              <Avatar row={s} />
                              <span>{memberLabel(s)}</span>
                              <span className="sub-date">{day(s.createdAt)}</span>
                            </li>
                          ))}
                      </ul>
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "members" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th className="is-num">Stars cast</th>
                <th>Last starred</th>
                <th aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {memberGroups.map((g) => {
                const key = `m${g.row.userId}`;
                const open = expanded.has(key);
                return (
                  <FragmentRows
                    key={key}
                    open={open}
                    colSpan={4}
                    main={
                      <>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <Avatar row={g.row} />
                            {memberLabel(g.row)}
                          </span>
                        </td>
                        <td className="is-num">
                          <span className="badge badge-accent" title="Stars cast">
                            <IconStar filled />
                            {g.stars.length}
                          </span>
                        </td>
                        <td className="is-date">{day(g.last)}</td>
                        <td className="is-actions">
                          <ExpandButton
                            open={open}
                            onClick={() => toggle(key)}
                            label={`Show what ${memberLabel(g.row)} starred`}
                          />
                        </td>
                      </>
                    }
                    detail={
                      <ul className="admin-sublist">
                        {[...g.stars]
                          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                          .map((s) => (
                            <li key={s.projectId}>
                              <Link href={projectHref(s)} className="mono">
                                {s.owner}/{s.repo}
                              </Link>
                              <span className="sub-date">{day(s.createdAt)}</span>
                            </li>
                          ))}
                      </ul>
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stack-16">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Project</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, activityShown).map((r) => (
                  <tr key={`${r.projectId}:${r.userId}`}>
                    <td className="is-date">{day(r.createdAt)}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Avatar row={r} />
                        {memberLabel(r)}
                      </span>
                    </td>
                    <td>
                      <Link href={projectHref(r)} className="mono">
                        {r.owner}/{r.repo}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{sourceLabel(r.source)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activity.length > activityShown && (
            <div className="admin-foot">
              <span className="meta-mono">
                Showing {activityShown} of {activity.length} stars
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActivityShown((n) => n + ACTIVITY_PAGE)}
              >
                Show more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A table row plus its optional expanded detail row (one <td> spanning all columns). */
function FragmentRows({
  open,
  colSpan,
  main,
  detail,
}: {
  open: boolean;
  colSpan: number;
  main: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <>
      <tr className={open ? "is-open" : ""}>{main}</tr>
      {open && (
        <tr className="admin-detail">
          <td colSpan={colSpan}>{detail}</td>
        </tr>
      )}
    </>
  );
}
