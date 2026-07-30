"use client";

import { useRef } from "react";
import { MaintainerManager } from "@/components/maintainer-manager";
import { IconPlus } from "@/components/icons";

/**
 * Claimant-only entry point on the project page: a small button that opens a
 * modal with the maintainer list. Changes inside apply immediately.
 */
export function ManageMaintainersDialog({
  projectId,
  maintainers,
}: {
  projectId: number;
  maintainers: { githubLogin: string }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => ref.current?.showModal()}
      >
        <IconPlus />
        Add maintainer
      </button>
      <dialog
        ref={ref}
        className="mm-dialog"
        onClick={(e) => {
          // A click on the backdrop targets the dialog element itself.
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="stack-16">
          <div className="row-between">
            <h3 style={{ fontSize: 15 }}>Additional maintainers</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => ref.current?.close()}
            >
              Close
            </button>
          </div>
          <p className="form-hint" style={{ margin: 0 }}>
            Anyone here gets the same editing rights as you, the moment they
            sign in with that GitHub account connected. Changes apply
            immediately.
          </p>
          <MaintainerManager projectId={projectId} maintainers={maintainers} />
        </div>
      </dialog>
    </>
  );
}
