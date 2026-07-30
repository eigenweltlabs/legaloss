import { ManageMaintainersDialog } from "@/components/maintainer-dialog";

/**
 * The additional-maintainers rows of the project page's Maintainer card, plus
 * the claimant's manage button. Avatars come straight from GitHub, since a
 * grant may name an account that has never signed in here.
 */
export function MaintainerCardExtras({
  projectId,
  maintainers,
  isClaimant,
}: {
  projectId: number;
  maintainers: { githubLogin: string }[];
  isClaimant: boolean;
}) {
  if (maintainers.length === 0 && !isClaimant) return null;
  return (
    <>
      {maintainers.map((m) => (
        <div key={m.githubLogin} className="cluster">
          <span className="avatar is-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://github.com/${m.githubLogin}.png?size=64`} alt="" />
          </span>
          <a
            href={`https://github.com/${m.githubLogin}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{ fontSize: 12, color: "var(--muted)" }}
          >
            @{m.githubLogin}
          </a>
        </div>
      ))}
      {isClaimant && (
        <div>
          <ManageMaintainersDialog projectId={projectId} maintainers={maintainers} />
        </div>
      )}
    </>
  );
}
