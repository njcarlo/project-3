"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CatalogItem, PriceSubmission, UserProfile } from "@/lib/types";

type Filter = "all" | "flagged" | "active";

export default function AdminPricesPage() {
  const { user, loading, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<PriceSubmission[] | null>(null);
  const [catalogNames, setCatalogNames] = useState<Record<string, CatalogItem>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(
      query(
        collection(db, "priceSubmissions"),
        orderBy("submittedAt", "desc"),
        limit(200)
      ),
      async (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as PriceSubmission
        );
        setSubmissions(items);

        const missingItems = [
          ...new Set(items.map((s) => s.catalogItemId)),
        ].filter((id) => !(id in catalogNames));
        const missingUsers = [
          ...new Set(items.map((s) => s.submittedBy)),
        ].filter((id) => !(id in userNames));

        const [itemEntries, userEntries] = await Promise.all([
          Promise.all(
            missingItems.map(async (id) => {
              const snap = await getDoc(doc(db, "catalogItems", id));
              return [id, snap.data() as CatalogItem] as const;
            })
          ),
          Promise.all(
            missingUsers.map(async (uid) => {
              const snap = await getDoc(doc(db, "users", uid));
              const profile = snap.data() as UserProfile | undefined;
              return [uid, profile?.displayName ?? "Collector"] as const;
            })
          ),
        ]);

        if (itemEntries.length > 0) {
          setCatalogNames((prev) => ({ ...prev, ...Object.fromEntries(itemEntries) }));
        }
        if (userEntries.length > 0) {
          setUserNames((prev) => ({ ...prev, ...Object.fromEntries(userEntries) }));
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function flagAsFake(id: string) {
    await updateDoc(doc(db, "priceSubmissions", id), {
      flagged: true,
      status: "excluded",
    });
  }

  async function approve(id: string) {
    await updateDoc(doc(db, "priceSubmissions", id), {
      flagged: false,
      status: "active",
    });
  }

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

  const filtered = (submissions ?? []).filter((s) => {
    if (filter === "flagged") return s.flagged;
    if (filter === "active") return s.status === "active" && !s.flagged;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Price submissions
      </h1>
      <p className="mb-6 text-sm text-muted">
        Review community price submissions. Flagging a submission excludes it
        from the item&apos;s price aggregate.
      </p>

      <div className="mb-4 flex gap-2 text-sm">
        {(["all", "flagged", "active"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 capitalize transition-colors ${
              filter === f
                ? "bg-accent text-accent-foreground"
                : "border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {submissions === null ? (
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No submissions in this view.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => {
            const item = catalogNames[s.catalogItemId];
            return (
              <div
                key={s.id}
                className="card flex items-center gap-3 rounded-xl p-3"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background">
                  {item?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item?.name ?? "Unknown item"} — ₱
                    {s.price.toLocaleString()}
                    <span className="ml-1 text-xs text-muted">
                      ({s.type === "paid" ? "paid" : "estimate"})
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {userNames[s.submittedBy] ?? "Collector"}
                    {s.sourceNote && ` · ${s.sourceNote}`}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.flagged
                      ? "bg-red-500/15 text-red-500"
                      : "bg-emerald-500/15 text-emerald-500"
                  }`}
                >
                  {s.flagged ? "Flagged" : "Active"}
                </span>

                {s.flagged ? (
                  <button
                    onClick={() => approve(s.id)}
                    className="rounded-full border border-card-border px-3 py-1 text-xs font-medium hover:bg-background"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={() => flagAsFake(s.id)}
                    className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white"
                  >
                    Flag as fake
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
