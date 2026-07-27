"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/stars", label: "Stars" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`glass-chip${pathname.startsWith(t.href) ? " is-active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
