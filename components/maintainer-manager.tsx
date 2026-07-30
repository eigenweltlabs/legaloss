"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProjectMaintainer, removeProjectMaintainer } from "@/app/actions";

type Maintainer = { githubLogin: string };

/**
 * Claimant-only list of GitHub accounts with maintainer rights on the project.
 * Grants are keyed on the GitHub login, so they work whether or not that
 * person has an account here yet.
 */
export function MaintainerManager({
  projectId,
  maintainers,
}: {
  projectId: number;
  maintainers: Maintainer[];
}) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!login.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addProjectMaintainer({ projectId, githubLogin: login });
      if (result.ok) {
        setLogin("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove(githubLogin: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeProjectMaintainer({ projectId, githubLogin });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="stack-16">
      {maintainers.length > 0 && (
        <div className="stack-8">
          {maintainers.map((m) => (
            <div key={m.githubLogin} className="row-between">
              <a
                href={`https://github.com/${m.githubLogin}`}
                target="_blank"
                rel="noreferrer"
                className="mono"
                style={{ fontSize: 13 }}
              >
                @{m.githubLogin}
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => remove(m.githubLogin)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="cluster" style={{ alignItems: "stretch" }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="GitHub username, e.g. octocat"
            maxLength={300}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={add}
          disabled={pending || login.trim().length === 0}
        >
          {pending ? "Adding…" : "Add maintainer"}
        </button>
      </div>

      {error && <div className="notice is-error">{error}</div>}
    </div>
  );
}
