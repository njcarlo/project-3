"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Mezastar Collector
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/catalog">Catalog</Link>
          <Link href="/collection">Collection</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/trade/new">Trade</Link>
          <Link href="/community">Community</Link>
          {!loading && user && (
            <>
              <Link href={`/u/${user.uid}`}>Profile</Link>
              <button onClick={() => signOut()} className="text-sm underline">
                Sign out
              </button>
            </>
          )}
          {!loading && !user && <Link href="/login">Sign in</Link>}
        </div>
      </nav>
    </header>
  );
}
