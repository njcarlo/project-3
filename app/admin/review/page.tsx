"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CatalogItem, UserProfile } from "@/lib/types";
import { RarityBadge } from "@/components/RarityBadge";

export default function AdminReviewPage() {
  const { user, loading, isAdmin } = useAuth();
  const [pending, setPending] = useState<CatalogItem[] | null>(null);
  const [submitterNames, setSubmitterNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(
      query(collection(db, "catalogItems"), where("status", "==", "pending")),
      async (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogItem);
        setPending(items);

        const missing = [...new Set(items.map((i) => i.createdBy))].filter(
          (uid) => uid !== "seed-script"
        );
        const entries = await Promise.all(
          missing.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const profile = snap.data() as UserProfile | undefined;
            return [uid, profile?.displayName ?? "Collector"] as const;
          })
        );
        setSubmitterNames(Object.fromEntries(entries));
      }
    );
  }, [user, isAdmin]);

  async function approve(id: string) {
    await updateDoc(doc(db, "catalogItems", id), {
      status: "approved",
      updatedAt: serverTimestamp(),
    });
  }

  async function reject(id: string) {
    await updateDoc(doc(db, "catalogItems", id), {
      status: "rejected",
      updatedAt: serverTimestamp(),
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Review queue</h1>
      <p className="mb-6 text-sm text-muted">
        Community-suggested tags awaiting approval.
      </p>

      {pending === null ? (
        <p className="text-muted">Loading...</p>
      ) : pending.length === 0 ? (
        <p className="text-muted">Nothing pending.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((item) => (
            <div key={item.id} className="card flex items-center gap-3 rounded-xl p-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <RarityBadge rarity={item.rarity} />
                  <span className="text-xs text-muted">
                    {item.seriesName} · #{item.number}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Suggested by {submitterNames[item.createdBy] ?? "Collector"}
                  {item.notes && ` · ${item.notes}`}
                </p>
              </div>

              <button
                onClick={() => approve(item.id)}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white"
              >
                Approve
              </button>
              <button
                onClick={() => reject(item.id)}
                className="rounded-full border border-card-border px-4 py-1.5 text-xs font-medium hover:bg-background"
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
