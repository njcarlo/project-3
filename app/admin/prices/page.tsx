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

type Filter = "pending" | "active" | "excluded" | "all";

export default function AdminPricesPage() {
  const { user, loading, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<PriceSubmission[] | null>(null);
  const [catalogNames, setCatalogNames] = useState<Record<string, CatalogItem>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("pending");

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

  async function approve(id: string) {
    await updateDoc(doc(db, "priceSubmissions", id), {
      flagged: false,
      status: "active",
    });
  }

  async function reject(id: string) {
    await updateDoc(doc(db, "priceSubmissions", id), {
      flagged: true,
      status: "excluded",
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

  const pendingCount = (submissions ?? []).filter((s) => s.status === "pending").length;
  const filtered = (submissions ?? []).filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Price submissions
      </h1>
      <p className="mb-6 text-sm text-muted">
        Approve or reject community price submissions. Contributors&apos;
        submissions auto-approve and never appear in the pending queue.
      </p>

      <BatchThresholdTool />

      <div className="mb-4 mt-8 flex gap-2 text-sm">
        {(["pending", "active", "excluded", "all"] as Filter[]).map((f) => (
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
            {f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
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
                    s.status === "active"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : s.status === "pending"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {s.status === "active"
                    ? "Active"
                    : s.status === "pending"
                      ? "Pending"
                      : "Excluded"}
                </span>

                {s.status !== "active" && (
                  <button
                    onClick={() => approve(s.id)}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white"
                  >
                    Approve
                  </button>
                )}
                {s.status !== "excluded" && (
                  <button
                    onClick={() => reject(s.id)}
                    className="rounded-full border border-card-border px-3 py-1 text-xs font-medium hover:bg-background"
                  >
                    {s.status === "pending" ? "Reject" : "Flag as fake"}
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

// Bulk-set a baseline price for every approved catalog item in a rarity
// group at once — useful for common tags (white 2-4★) that rarely get
// enough individual community submissions to form a real average.
const THRESHOLD_GROUPS: { label: string; rarities: string[] }[] = [
  { label: "White ★2 – ★4", rarities: ["white-2", "white-3", "white-4"] },
  { label: "Star ★5", rarities: ["white-5"] },
];

function BatchThresholdTool() {
  const { user } = useAuth();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(group: (typeof THRESHOLD_GROUPS)[number]) {
    const priceNum = Number(prices[group.label]);
    if (!user || !priceNum || priceNum <= 0) return;

    setBusyGroup(group.label);
    setError(null);
    setResult(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/prices/batch-set", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rarities: group.rarities, price: priceNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to apply.");
      setResult(`Set ₱${priceNum.toLocaleString()} as the baseline for ${data.updated} ${group.label} tag(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setBusyGroup(null);
    }
  }

  return (
    <div className="card rounded-xl p-4">
      <h2 className="mb-1 text-sm font-semibold">Batch threshold price</h2>
      <p className="mb-4 text-xs text-muted">
        Sets a baseline price across every approved tag in a rarity group at
        once (counts as one admin submission per tag — real submissions still
        average in normally, and re-applying updates the same baseline
        instead of stacking).
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {THRESHOLD_GROUPS.map((group) => (
          <div
            key={group.label}
            className="flex flex-1 items-center gap-2 rounded-lg border border-card-border p-2"
          >
            <span className="min-w-0 flex-1 text-sm font-medium">
              {group.label}
            </span>
            <input
              type="number"
              min={1}
              placeholder="₱ price"
              value={prices[group.label] ?? ""}
              onChange={(e) =>
                setPrices((p) => ({ ...p, [group.label]: e.target.value }))
              }
              className="w-24 rounded-lg border border-card-border bg-background px-2 py-1 text-sm"
            />
            <button
              onClick={() => apply(group)}
              disabled={busyGroup === group.label || !prices[group.label]}
              className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
            >
              {busyGroup === group.label ? "Applying..." : "Apply"}
            </button>
          </div>
        ))}
      </div>
      {result && <p className="mt-3 text-xs text-emerald-500">{result}</p>}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}
