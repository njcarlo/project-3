"use client";

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { TradeStatus } from "@/lib/types";

export function TradeActions({
  tradeId,
  counterpartyUid,
  status,
}: {
  tradeId: string;
  counterpartyUid: string;
  status: TradeStatus;
}) {
  const { user } = useAuth();

  if (!user || user.uid !== counterpartyUid || status !== "proposed") {
    return null;
  }

  async function setStatus(next: TradeStatus) {
    await updateDoc(doc(db, "trades", tradeId), {
      status: next,
      updatedAt: serverTimestamp(),
    });
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setStatus("accepted")}
        className="rounded-full bg-emerald-500 px-5 py-2 font-medium text-white"
      >
        Accept
      </button>
      <button
        onClick={() => setStatus("declined")}
        className="rounded-full border border-card-border px-5 py-2 font-medium hover:bg-card"
      >
        Decline
      </button>
    </div>
  );
}
