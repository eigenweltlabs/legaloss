"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCount } from "@/lib/format";
import { IconArrowRight, IconStar } from "@/components/icons";

const ROTATE_MS = 6000;

export type FeaturedRotatorItem = {
  id: number;
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
 * Editorial showcase above the search bar. Cycles through admin-featured
 * projects; pauses on hover/focus and sits still under reduced motion.
 */
export function FeaturedRotator({ items }: { items: FeaturedRotatorItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [items.length, paused]);

  if (items.length === 0) return null;
  const it = items[index % items.length];

  return (
    <section
      className="featured-band glass"
      aria-label="Featured projects"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="featured-eyebrow">Featured</span>
      {/* Key forces a remount per slide so the fade-in replays. */}
      <Link
        key={it.id}
        href={`/projects/${it.owner}/${it.repo}`}
        className="featured-slide"
      >
        <span className="featured-name">{it.name}</span>
        <span className="featured-desc">
          {it.tagline ?? it.description ?? `${it.owner}/${it.repo}`}
        </span>
        <span className="featured-meta">
          <span className="featured-stat">
            <IconStar filled />
            {formatCount(it.ghStars)}
          </span>
          {it.language && <span className="featured-stat">{it.language}</span>}
          {it.categories[0] && (
            <span className="featured-stat">{it.categories[0].name}</span>
          )}
          <IconArrowRight className="featured-arrow" />
        </span>
      </Link>
      {items.length > 1 && (
        <div className="featured-dots" role="tablist" aria-label="Featured projects">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${item.name}`}
              className={`featured-dot${i === index ? " is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
