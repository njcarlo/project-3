"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CatalogItem, CatalogSeries, Rarity } from "@/lib/types";
import { RARITY_OPTIONS, getRarityStyle } from "@/lib/rarity";

function NewItemForm({
  series,
  onCreated,
}: {
  series: CatalogSeries[];
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [seriesId, setSeriesId] = useState(series[0]?.id ?? "");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState<Rarity>("white-2");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !seriesId || !number.trim() || !name.trim()) return;
    setBusy(true);
    try {
      const s = series.find((s) => s.id === seriesId);
      await addDoc(collection(db, "catalogItems"), {
        seriesId,
        seriesName: s?.name ?? seriesId,
        number: number.trim(),
        name: name.trim(),
        rarity,
        imageUrl: imageUrl.trim(),
        notes: "",
        createdBy: user.uid,
        status: "approved",
        lastPriceAggregate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNumber("");
      setName("");
      setImageUrl("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-2 rounded-xl p-4 sm:grid-cols-2">
      <select
        value={seriesId}
        onChange={(e) => setSeriesId(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
      >
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        placeholder="Number (e.g. 071)"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
      />
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
      />
      <select
        value={rarity}
        onChange={(e) => setRarity(e.target.value as Rarity)}
        className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
      >
        {RARITY_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {getRarityStyle(r).label}
          </option>
        ))}
      </select>
      <input
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm sm:col-span-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50 sm:col-span-2"
      >
        {busy ? "Adding..." : "Add tag"}
      </button>
    </form>
  );
}

export default function AdminCatalogPage() {
  const { user, loading, isAdmin } = useAuth();
  const [series, setSeries] = useState<CatalogSeries[]>([]);
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(collection(db, "catalogSeries"), (snap) => {
      setSeries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogSeries));
    });
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    return onSnapshot(
      query(collection(db, "catalogItems"), orderBy("seriesId"), orderBy("number")),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogItem));
      }
    );
  }, [user, isAdmin]);

  async function updateField(id: string, field: string, value: unknown) {
    await updateDoc(doc(db, "catalogItems", id), {
      [field]: value,
      updatedAt: serverTimestamp(),
    });
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this catalog item? This cannot be undone.")) return;
    await deleteDoc(doc(db, "catalogItems", id));
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

  const filtered = (items ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          {showNewForm ? "Cancel" : "Add tag"}
        </button>
      </div>

      {showNewForm && (
        <div className="mb-6">
          <NewItemForm series={series} onCreated={() => setShowNewForm(false)} />
        </div>
      )}

      <input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
      />

      {items === null ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <div key={item.id} className="card flex items-center gap-3 rounded-xl p-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background">
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
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.seriesName} · #{item.number}
                </p>
              </div>

              <select
                value={item.rarity}
                onChange={(e) => updateField(item.id, "rarity", e.target.value)}
                className="rounded-lg border border-card-border bg-background px-2 py-1 text-xs"
              >
                {RARITY_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {getRarityStyle(r).label}
                  </option>
                ))}
              </select>

              <select
                value={item.status}
                onChange={(e) => updateField(item.id, "status", e.target.value)}
                className="rounded-lg border border-card-border bg-background px-2 py-1 text-xs"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
