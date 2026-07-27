"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { formatCount } from "@/lib/format";
import { IconGitHub, IconStar } from "@/components/icons";

const LINKS = [
  { href: "/", label: "Directory" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

const REPO_URL = "https://github.com/eigenweltlabs/legaloss";

export function SiteHeader({
  trackedStars,
  isAdmin = false,
}: {
  trackedStars: number;
  /** Resolved server-side from the ADMIN_USER_IDS allowlist. */
  isAdmin?: boolean;
}) {
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
            <Show when="signed-in">
              <Link
                href="/starred"
                className={pathname.startsWith("/starred") ? "is-current" : ""}
              >
                Starred
              </Link>
            </Show>
            {isAdmin && (
              <Link
                href="/admin/claims"
                className={pathname.startsWith("/admin") ? "is-current" : ""}
              >
                Admin
              </Link>
            )}
          </nav>
          <span className="topbar-stat" title="GitHub stars across all indexed projects">
            <IconStar filled />
            <span className="numeral">{formatCount(trackedStars)}</span>
            <span className="topbar-stat-l">tracked</span>
          </span>
          <div className="topbar-right">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="topbar-gh"
              aria-label="LegalOSS on GitHub"
              title="View the source on GitHub"
            >
              <IconGitHub />
            </a>
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
        <Show when="signed-in">
          <Link href="/starred" onClick={() => setDrawerOpen(false)}>
            Starred
          </Link>
        </Show>
        {isAdmin && (
          <Link href="/admin/claims" onClick={() => setDrawerOpen(false)}>
            Admin
          </Link>
        )}
        <Link href="/submit" onClick={() => setDrawerOpen(false)}>
          Submit a project
        </Link>
        <Show when="signed-out">
          <Link href="/sign-in" onClick={() => setDrawerOpen(false)}>
            Log in
          </Link>
        </Show>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="nav-drawer-gh"
          onClick={() => setDrawerOpen(false)}
        >
          GitHub
        </a>
      </nav>
    </>
  );
}
