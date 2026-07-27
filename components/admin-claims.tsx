"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminGrantClaim, adminReleaseClaim } from "@/app/actions";
import type { AdminProjectRow } from "@/lib/projects";
import type { Member } from "@/lib/users";
import { IconShield, IconTrash } from "@/components/icons";

function claimantLabel(p: AdminProjectRow): string {
  return p.claimantName ?? p.claimantUsername ?? p.claimedById ?? "someone";
}

/**
 * Admin claim tool: pick a project, pick the person, grant. Both server
 * actions re-check admin rights, so this component is convenience, not
 * security.
 */
export function AdminClaims({
  projects,
  members,
  projectHrefs,
}: {
  projects: AdminProjectRow[];
  members: Member[];
  /** Detail-page path per project id, built server-side. */
  projectHrefs: Record<number, string>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<string>("");
  const [reassign, setReassign] = useState(false);
  const [notice, setNotice] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );
  const claimed = useMemo(
    () => projects.filter((p) => p.claimedById !== null),
    [projects],
  );

  function grant() {
    if (projectId === "" || !memberId) return;
    setNotice(null);
    startTransition(async () => {
      const result = await adminGrantClaim({
        projectId: Number(projectId),
        clerkUserId: memberId,
        reassign,
      });
      if (result.ok) {
        setNotice({
          kind: "ok",
          text: result.reassigned
            ? `Reassigned to ${result.claimant}.`
            : `Granted to ${result.claimant}.`,
        });
        setReassign(false);
        router.refresh();
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    });
  }

  function release(id: number) {
    setNotice(null);
    startTransition(async () => {
      const result = await adminReleaseClaim(id);
      if (result.ok) {
        setNotice({ kind: "ok", text: "Claim released." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <div className="stack-24">
      <div className="glass-strong panel" style={{ borderRadius: "var(--radius-xl)" }}>
        <div className="stack-16">
          <div className="stack-8">
            <label className="form-label" htmlFor="admin-project">
              Project
            </label>
            <select
              id="admin-project"
              className="select"
              value={projectId}
              onChange={(e) =>
                setProjectId(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.owner}/{p.repo}
                  {p.source === "huggingface" ? " (Hugging Face)" : ""}
                  {p.claimedById ? ` — claimed by ${claimantLabel(p)}` : ""}
                </option>
              ))}
            </select>
            {selected?.claimedById && (
              <p className="form-hint">
                Already claimed by {claimantLabel(selected)}. Granting it to
                someone else needs the reassign box below.
              </p>
            )}
          </div>

          <div className="stack-8">
            <label className="form-label" htmlFor="admin-member">
              Grant to
            </label>
            <select
              id="admin-member"
              className="select"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="form-hint">
              Everyone who has signed in, newest first. If the person you want
              isn&apos;t here, they haven&apos;t signed in yet — a claim can
              only attach to an existing account.
            </p>
          </div>

          <label className="choice-chip" style={{ alignSelf: "flex-start" }}>
            <input
              type="checkbox"
              checked={reassign}
              onChange={(e) => setReassign(e.target.checked)}
            />
            Reassign if already claimed
          </label>

          <div className="stack-8">
            <button
              type="button"
              className="btn btn-primary"
              onClick={grant}
              disabled={pending || projectId === "" || !memberId}
            >
              <IconShield />
              {pending ? "Working…" : "Grant claim"}
            </button>
            {notice && (
              <div className={`notice is-${notice.kind === "ok" ? "success" : "error"}`}>
                {notice.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stack-8">
        <h2 className="display-s" style={{ fontSize: 20 }}>
          Claimed projects
          <span className="meta-mono" style={{ marginLeft: 10 }}>
            {claimed.length}
          </span>
        </h2>
        {claimed.length === 0 ? (
          <p className="body-s">No project has been claimed yet.</p>
        ) : (
          <ul className="admin-rows">
            {claimed.map((p) => (
              <li key={p.id}>
                <div className="stack-4" style={{ minWidth: 0 }}>
                  <Link href={projectHrefs[p.id]} className="mono">
                    {p.owner}/{p.repo}
                  </Link>
                  <span className="body-s">
                    {claimantLabel(p)}
                    {p.claimedAt
                      ? ` · ${p.claimedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => release(p.id)}
                  disabled={pending}
                >
                  <IconTrash />
                  Release
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
