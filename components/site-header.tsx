"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { formatCount } from "@/lib/format";
import { IconStar } from "@/components/icons";

const LINKS = [
  { href: "/", label: "Directory" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ trackedStars }: { trackedStars: number }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The drawer covers the page; the page must not keep scrolling under it.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="topbar-brand">
            LegalOSS
          </Link>
          <nav className="topbar-links">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href))
                    ? "is-current"
                    : ""
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="topbar-stat" title="GitHub stars across all indexed projects">
            <IconStar filled />
            <span className="numeral">{formatCount(trackedStars)}</span>
            <span className="topbar-stat-l">tracked</span>
          </span>
          <div className="topbar-right">
            <Show when="signed-out">
              <Link href="/sign-in" className="topbar-login">
                Log in
              </Link>
            </Show>
            <Link href="/submit" className="btn btn-primary btn-sm topbar-cta">
              Submit a project
            </Link>
            <Show when="signed-in">
              <span className="topbar-user">
                <UserButton userProfileUrl="/account" userProfileMode="navigation" />
              </span>
            </Show>
            <button
              className="topbar-burger"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      <nav
        id="nav-drawer"
        className={`nav-drawer${drawerOpen ? " open" : ""}`}
        aria-label="Menu"
        // Off-screen links must not be tabbable or read by screen readers.
        inert={!drawerOpen}
      >
        <button
          className="nav-drawer-close"
          onClick={() => setDrawerOpen(false)}
        >
          Close
        </button>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setDrawerOpen(false)}>
            {l.label}
          </Link>
        ))}
        <Link href="/submit" onClick={() => setDrawerOpen(false)}>
          Submit a project
        </Link>
        <Show when="signed-out">
          <Link href="/sign-in" onClick={() => setDrawerOpen(false)}>
            Log in
          </Link>
        </Show>
      </nav>
    </>
  );
}
