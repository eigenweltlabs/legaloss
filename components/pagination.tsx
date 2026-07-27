import Link from "next/link";

/** Page numbers to render: always first and last, plus a window around current. */
function pageWindow(current: number, last: number): (number | "gap")[] {
  const pages = new Set<number>([1, last, current]);
  for (const p of [current - 1, current + 1]) {
    if (p >= 1 && p <= last) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

/**
 * Server-rendered pager: plain links, so pages are crawlable, shareable, and
 * work without JavaScript. Every current filter is carried across via params.
 */
export function Pagination({
  page,
  perPage,
  total,
  params,
}: {
  page: number;
  perPage: number;
  total: number;
  /** Current query string minus `page`. */
  params: URLSearchParams;
}) {
  const last = Math.max(1, Math.ceil(total / perPage));
  if (last <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams(params);
    // Page 1 is the canonical bare URL — no ?page=1 in links.
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };

  const first = (page - 1) * perPage + 1;
  const lastShown = Math.min(page * perPage, total);

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="pager-range meta-mono">
        {first}–{lastShown} of {total}
      </span>
      <div className="pager-links">
        {page > 1 ? (
          <Link href={href(page - 1)} className="glass-chip" rel="prev">
            ← Prev
          </Link>
        ) : (
          <span className="glass-chip is-disabled" aria-hidden="true">
            ← Prev
          </span>
        )}
        {pageWindow(page, last).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="pager-gap">
              …
            </span>
          ) : p === page ? (
            <span key={p} className="glass-chip is-active" aria-current="page">
              {p}
            </span>
          ) : (
            <Link key={p} href={href(p)} className="glass-chip">
              {p}
            </Link>
          ),
        )}
        {page < last ? (
          <Link href={href(page + 1)} className="glass-chip" rel="next">
            Next →
          </Link>
        ) : (
          <span className="glass-chip is-disabled" aria-hidden="true">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
