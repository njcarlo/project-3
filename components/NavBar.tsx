"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

const LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/collection", label: "Collection" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade/new", label: "Trade" },
  { href: "/community", label: "Community" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function NavBar() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = isAdmin
    ? [...LINKS, { href: "/admin/prices", label: "Admin" }]
    : LINKS;

  const linkClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted hover:bg-card-border/60 hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-card-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-accent-foreground">
            M
          </span>
          <span className="hidden sm:inline">Mezastar Collector</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(pathname === link.href)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden shrink-0 items-center gap-3 text-sm md:flex">
          {!loading && user && (
            <>
              <Link
                href={`/u/${user.uid}`}
                className="text-muted hover:text-foreground"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut()}
                className="whitespace-nowrap rounded-full border border-card-border px-3 py-1.5 text-muted hover:text-foreground"
              >
                Sign out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-muted hover:bg-card-border/60 hover:text-foreground md:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-card-border md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={linkClass(pathname === link.href)}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-1 border-t border-card-border" />

            {!loading && user && (
              <>
                <Link
                  href={`/u/${user.uid}`}
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1.5 text-muted hover:bg-card-border/60 hover:text-foreground"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="rounded-full px-3 py-1.5 text-left text-muted hover:bg-card-border/60 hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            )}
            {!loading && !user && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full bg-accent px-3 py-1.5 text-center font-medium text-accent-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
