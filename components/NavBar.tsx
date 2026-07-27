"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

const LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/collection", label: "Collection" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trade/new", label: "Trade" },
  { href: "/community", label: "Community" },
];

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-card-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-accent-foreground">
            M
          </span>
          <span className="hidden sm:inline">Mezastar Collector</span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-card-border/60 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-sm">
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
                className="rounded-full border border-card-border px-3 py-1.5 text-muted hover:text-foreground"
              >
                Sign out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
