"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { PriceSubmissionType } from "@/lib/types";

export function SubmitPriceForm({ catalogItemId }: { catalogItemId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [type, setType] = useState<PriceSubmissionType>("paid");
  const [sourceNote, setSourceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return;

    setBusy(true);
    try {
      await addDoc(collection(db, "priceSubmissions"), {
        catalogItemId,
        submittedBy: user!.uid,
        price: priceNum,
        currency: "JPY",
        type,
        sourceNote,
        submittedAt: serverTimestamp(),
        flagged: false,
        status: "active",
      });
      setDone(true);
      setOpen(false);
      setPrice("");
      setSourceNote("");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-black/20 px-4 py-2 text-sm dark:border-white/20"
      >
        {done ? "Submit another price" : "Submit a price"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
      <input
        type="number"
        required
        min={1}
        placeholder="Price (JPY)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PriceSubmissionType)}
        className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
      >
        <option value="paid">What I paid</option>
        <option value="estimated_value">My estimated value</option>
      </select>
      <input
        type="text"
        placeholder="Source (e.g. Mercari, local shop)"
        value={sourceNote}
        onChange={(e) => setSourceNote(e.target.value)}
        className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-3 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Submit
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
