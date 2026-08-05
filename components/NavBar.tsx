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
  { href: "/leaderboard", label: "Leaderboard" },
];

export function NavBar() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin/prices", label: "Admin" }]
    : LINKS;

  return (
    <header className="sticky top-0 z-10 border-b border-card-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm text-accent-foreground">
            M
          </span>
          <span className="hidden sm:inline">Mezastar Collector</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
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

        <div className="flex shrink-0 items-center gap-3 text-sm">
          {!loading && user && (
            <>
              <Link
                href={`/u/${user.uid}`}
                className="hidden text-muted hover:text-foreground sm:inline"
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
      </nav>
    </header>
  );
}
