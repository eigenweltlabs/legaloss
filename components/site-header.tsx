"use client";

import { useState } from "react";
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
              onClick={() => setDrawerOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      <div className={`nav-drawer${drawerOpen ? " open" : ""}`}>
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
      </div>
    </>
  );
}
