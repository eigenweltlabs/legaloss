import Link from "next/link";
import { formatCount } from "@/lib/format";
import { projectHref } from "@/lib/sources";
import { IconStar } from "@/components/icons";

export type FeaturedRotatorItem = {
  id: number;
  source: string;
  sourceType: string | null;
  owner: string;
  repo: string;
  name: string;
  tagline: string | null;
  description: string | null;
  language: string | null;
  ghStars: number;
  categories: { slug: string; name: string }[];
};

/**
 * Compact featured cards drifting horizontally above the search bar. Pure CSS
 * marquee: the list renders twice and slides by 50%; pauses on hover and goes
 * static (scrollable) under reduced motion.
 */
export function FeaturedRotator({ items }: { items: FeaturedRotatorItem[] }) {
  if (items.length === 0) return null;
  const animated = items.length > 1;
  const loop = animated ? [...items, ...items] : items;

  return (
    <section className="featured-strip" aria-label="Featured projects">
      <span className="featured-eyebrow">Featured</span>
      <div className="featured-viewport">
        <div
          className={`featured-track${animated ? " is-animated" : ""}`}
          style={{ "--featured-count": items.length } as React.CSSProperties}
        >
        {loop.map((it, i) => {
          const clone = i >= items.length;
          const isHf = it.source === "huggingface";
          return (
            <Link
              key={`${it.id}-${i}`}
              href={projectHref(it)}
              className="featured-card"
              aria-hidden={clone || undefined}
              tabIndex={clone ? -1 : undefined}
            >
              {isHf ? (
                <span className="fc-avatar fc-avatar-hf" aria-hidden>
                  {it.owner.charAt(0).toUpperCase()}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://github.com/${it.owner}.png?size=80`}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                />
              )}
              <span className="fc-text">
                <span className="fc-name">{it.name}</span>
                <span className="fc-meta">
                  <IconStar filled />
                  {formatCount(it.ghStars)}
                  {it.language ? ` · ${it.language}` : ""}
                  {it.categories[0] ? ` · ${it.categories[0].name}` : ""}
                </span>
              </span>
            </Link>
          );
        })}
        </div>
      </div>
    </section>
  );
}
