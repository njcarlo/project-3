"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export function QuickAddButton({
  catalogItemId,
  inline = false,
}: {
  catalogItemId: string;
  inline?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    setBusy(true);
    try {
      await addDoc(collection(db, "userCollections", user.uid, "items"), {
        catalogItemId,
        quantity: 1,
        condition: "good",
        acquiredDate: new Date().toISOString().slice(0, 10),
        acquiredPriceUser: null,
        sessionId: null,
        notes: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Quick add to collection"
      aria-label="Quick add to collection"
      className={`${
        inline ? "relative" : "absolute right-2 top-2 z-10"
      } flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold shadow transition-all hover:scale-105 disabled:opacity-70 ${
        added
          ? "bg-emerald-500 text-white opacity-100"
          : `bg-accent text-accent-foreground ${
              inline ? "" : "opacity-0 group-hover:opacity-100"
            }`
      }`}
    >
      {added ? "✓" : "+"}
    </button>
  );
}
