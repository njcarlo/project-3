"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CollectionSession, ItemCondition } from "@/lib/types";

type SessionChoice = "none" | "new" | string; // string = existing session id

export function AddToCollectionForm({
  catalogItemId,
}: {
  catalogItemId: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ItemCondition>("good");

  const [sessions, setSessions] = useState<CollectionSession[]>([]);
  const [sessionChoice, setSessionChoice] = useState<SessionChoice>("none");
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [newSessionCost, setNewSessionCost] = useState("");

  useEffect(() => {
    if (!user || !open) return;
    return onSnapshot(
      query(
        collection(db, "userCollections", user.uid, "sessions"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        setSessions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CollectionSession)
        );
      }
    );
  }, [user, open]);

  if (!user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Add to collection
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Add to collection
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let sessionId: string | null = null;

      if (sessionChoice === "new") {
        const costNum = newSessionCost ? Number(newSessionCost) : null;
        const sessionRef = await addDoc(
          collection(db, "userCollections", user!.uid, "sessions"),
          {
            label: newSessionLabel || `Session ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString().slice(0, 10),
            cost: costNum,
            currency: "JPY",
            notes: "",
            createdAt: serverTimestamp(),
          }
        );
        sessionId = sessionRef.id;
      } else if (sessionChoice !== "none") {
        sessionId = sessionChoice;
      }

      await addDoc(collection(db, "userCollections", user!.uid, "items"), {
        catalogItemId,
        quantity,
        condition,
        acquiredDate: new Date().toISOString().slice(0, 10),
        acquiredPriceUser: null,
        sessionId,
        notes: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/collection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-black/10 p-3 text-sm dark:border-white/10"
    >
      <div className="flex items-center gap-2">
        <label className="w-20 text-black/60 dark:text-white/60">Qty</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-20 rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="w-20 text-black/60 dark:text-white/60">
          Condition
        </label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as ItemCondition)}
          className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
        >
          <option value="mint">Mint</option>
          <option value="good">Good</option>
          <option value="played">Played</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-black/60 dark:text-white/60">
          Arcade session
        </legend>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={sessionChoice === "none"}
            onChange={() => setSessionChoice("none")}
          />
          Don&apos;t track a session
        </label>

        {sessions.map((s) => (
          <label key={s.id} className="flex items-center gap-2">
            <input
              type="radio"
              checked={sessionChoice === s.id}
              onChange={() => setSessionChoice(s.id)}
            />
            {s.label}
            {s.cost != null && (
              <span className="text-black/50 dark:text-white/50">
                (¥{s.cost.toLocaleString()})
              </span>
            )}
          </label>
        ))}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={sessionChoice === "new"}
            onChange={() => setSessionChoice("new")}
          />
          Start a new session
        </label>

        {sessionChoice === "new" && (
          <div className="ml-6 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Session name (optional)"
              value={newSessionLabel}
              onChange={(e) => setNewSessionLabel(e.target.value)}
              className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
            />
            <input
              type="number"
              min={0}
              placeholder="What did this session cost? (JPY)"
              value={newSessionCost}
              onChange={(e) => setNewSessionCost(e.target.value)}
              className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
            />
          </div>
        )}
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-3 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Adding..." : "Add to collection"}
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
