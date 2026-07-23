"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { EigenMark } from "@/components/eigen-mark";
import { BorderBeam } from "@/components/border-beam";

const LINKS = [
  { href: "/projects", label: "Directory" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!onHero) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHero]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const cls = [
    "gnav",
    onHero ? "on-hero" : "",
    onHero && scrolled ? "is-scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={cls}>
        {onHero && !scrolled && <BorderBeam radius={14} delays={[0, -3]} />}
        <Link href="/" className="gnav-brand">
          <EigenMark className="gnav-mark" />
          <span className="gnav-name">Open Legal Index</span>
        </Link>
        <nav className="gnav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? "is-current" : ""}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="gnav-right">
          <Show when="signed-out">
            <Link href="/sign-in" className="gnav-login">
              Log in
            </Link>
          </Show>
          <Link href="/submit" className="gnav-cta">
            Submit a project
          </Link>
          <Show when="signed-in">
            <span className="gnav-user">
              <UserButton userProfileUrl="/account" userProfileMode="navigation" />
            </span>
          </Show>
          <button
            className="gnav-burger"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <div className={`gnav-drawer${drawerOpen ? " open" : ""}`}>
        <button
          className="gnav-drawer-close"
          onClick={() => setDrawerOpen(false)}
        >
          Close
        </button>
        <Link href="/">Home</Link>
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
