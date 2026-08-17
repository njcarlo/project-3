"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserProfile } from "@/lib/types";

export default function AdminContributorsPage() {
  const { user, loading, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(list);
    });
  }, [user, isAdmin]);

  async function setContributor(uid: string, contributor: boolean) {
    await updateDoc(doc(db, "users", uid), { contributor });
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users ?? [];
    return (users ?? []).filter((u) =>
      u.displayName.toLowerCase().includes(term)
    );
  }, [users, search]);

  if (loading) return null;

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted">
        Not authorized.{" "}
        <Link href="/" className="text-accent underline">
          Go home
        </Link>
        .
      </div>
    );
  }

  const contributorCount = (users ?? []).filter((u) => u.contributor).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Contributors</h1>
      <p className="mb-6 text-sm text-muted">
        Contributors&apos; price submissions auto-approve, skipping the
        review queue. {contributorCount} contributor
        {contributorCount === 1 ? "" : "s"} currently.
      </p>

      <input
        type="search"
        placeholder="Search collectors by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
      />

      {users === null ? (
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No collectors match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <div
              key={u.uid}
              className="card flex items-center gap-3 rounded-xl p-3"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-background">
                {u.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.photoURL}
                    alt={u.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.displayName}</p>
                {u.role === "admin" && (
                  <span className="text-xs text-muted">Admin</span>
                )}
              </div>
              <button
                onClick={() => setContributor(u.uid, !u.contributor)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                  u.contributor
                    ? "border border-card-border text-muted hover:text-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {u.contributor ? "Remove contributor" : "Make contributor"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
