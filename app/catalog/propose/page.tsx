"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CatalogSeries, Rarity } from "@/lib/types";
import { RARITY_OPTIONS, getRarityStyle } from "@/lib/rarity";

export default function ProposeTagPage() {
  const { user, loading } = useAuth();
  const [series, setSeries] = useState<CatalogSeries[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState<Rarity>("white-2");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "catalogSeries"), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogSeries);
      setSeries(items);
      setSeriesId((prev) => prev || items[0]?.id || "");
    });
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to propose a missing tag.
        </p>
      </div>
    );
  }

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
        notes: notes.trim(),
        createdBy: user.uid,
        status: "pending",
        lastPriceAggregate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Propose a tag</h1>
      <p className="mb-6 text-sm text-muted">
        Missing a tag from the catalog? Suggest it here — an admin will
        review before it goes live.
      </p>

      {done ? (
        <div className="card rounded-xl p-5 text-sm">
          <p>Thanks — your suggestion is in the review queue.</p>
          <div className="mt-3 flex gap-3">
            <button onClick={() => setDone(false)} className="text-accent underline">
              Propose another
            </button>
            <Link href="/catalog" className="text-accent underline">
              Back to catalog
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card flex flex-col gap-3 rounded-xl p-5">
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          >
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Tag number (e.g. 071)"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Pokemon name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
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
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !seriesId}
            className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      )}
    </div>
  );
}
