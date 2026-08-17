"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { PriceSubmissionType } from "@/lib/types";

export function SubmitPriceForm({ catalogItemId }: { catalogItemId: string }) {
  const { user, isAdmin, isContributor } = useAuth();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [type, setType] = useState<PriceSubmissionType>("paid");
  const [sourceNote, setSourceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;

  const autoApproves = isAdmin || isContributor;

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
        currency: "PHP",
        type,
        sourceNote,
        submittedAt: serverTimestamp(),
        flagged: false,
        status: autoApproves ? "active" : "pending",
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
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-card-border px-4 py-2 text-sm font-medium hover:bg-card"
        >
          {done ? "Submit another price" : "Submit a price"}
        </button>
        {done && !autoApproves && (
          <span className="text-xs text-muted">
            Thanks — it&apos;s pending admin review before it counts.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-2 rounded-xl p-4 text-sm"
    >
      <input
        type="number"
        required
        min={1}
        placeholder="Price (PHP)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PriceSubmissionType)}
        className="rounded-lg border border-card-border bg-background px-2 py-1"
      >
        <option value="paid">What I paid</option>
        <option value="estimated_value">My estimated value</option>
      </select>
      <input
        type="text"
        placeholder="Source (e.g. Mercari, local shop)"
        value={sourceNote}
        onChange={(e) => setSourceNote(e.target.value)}
        className="rounded-lg border border-card-border bg-background px-2 py-1"
      />
      <p className="text-xs text-muted">
        {autoApproves
          ? "As a contributor, this counts immediately."
          : "This goes to admin review before it counts toward the average."}
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-4 py-1.5 font-medium text-accent-foreground disabled:opacity-50"
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
