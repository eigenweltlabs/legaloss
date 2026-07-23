"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "/", label: "Directory" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

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
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        <Link href="/submit">Submit a project</Link>
        <Show when="signed-out">
          <Link href="/sign-in">Log in</Link>
        </Show>
      </div>
    </>
  );
}
