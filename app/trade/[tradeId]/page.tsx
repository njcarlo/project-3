"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CatalogItem, Trade, TradeSideItem, UserProfile } from "@/lib/types";
import { RarityBadge } from "@/components/RarityBadge";
import { TradeActions } from "@/components/TradeActions";

interface ResolvedSideItem extends TradeSideItem {
  catalogItem: CatalogItem | null;
}

async function resolveItems(items: TradeSideItem[]): Promise<ResolvedSideItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const snap = await getDoc(doc(db, "catalogItems", item.catalogItemId));
      return {
        ...item,
        catalogItem: snap.exists()
          ? ({ id: snap.id, ...snap.data() } as CatalogItem)
          : null,
      };
    })
  );
}

function SideList({
  title,
  items,
}: {
  title: string;
  items: ResolvedSideItem[];
}) {
  const total = items.reduce(
    (sum, i) => sum + i.valueAtProposal * i.quantity,
    0
  );

  return (
    <div className="card rounded-xl p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-sm text-muted">
          ¥{Math.round(total).toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.catalogItemId} className="flex items-center gap-2">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background">
              {item.catalogItem?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.catalogItem.imageUrl}
                  alt={item.catalogItem.name}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.catalogItem?.name ?? "Unknown item"} × {item.quantity}
              </p>
              {item.catalogItem && (
                <RarityBadge rarity={item.catalogItem.rarity} />
              )}
            </div>
            <span className="text-sm text-muted">
              ¥{Math.round(item.valueAtProposal * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { user, loading } = useAuth();

  const [trade, setTrade] = useState<Trade | null | undefined>(undefined);
  const [initiatorItems, setInitiatorItems] = useState<ResolvedSideItem[]>([]);
  const [counterpartyItems, setCounterpartyItems] = useState<ResolvedSideItem[]>([]);
  const [names, setNames] = useState<{ initiator: string; counterparty: string }>({
    initiator: "",
    counterparty: "",
  });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "trades", tradeId),
      async (snap) => {
        if (!snap.exists()) {
          setTrade(null);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Trade;
        setTrade(data);

        const [ii, ci, initiatorDoc, counterpartyDoc] = await Promise.all([
          resolveItems(data.initiatorItems),
          resolveItems(data.counterpartyItems),
          getDoc(doc(db, "users", data.initiatorUid)),
          getDoc(doc(db, "users", data.counterpartyUid)),
        ]);

        setInitiatorItems(ii);
        setCounterpartyItems(ci);
        setNames({
          initiator: (initiatorDoc.data() as UserProfile | undefined)?.displayName ?? "Collector",
          counterparty: (counterpartyDoc.data() as UserProfile | undefined)?.displayName ?? "Collector",
        });
      },
      () => setTrade(null)
    );
  }, [user, tradeId]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to view this trade.
        </p>
      </div>
    );
  }

  if (trade === undefined) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-muted">Loading...</div>;
  }

  if (trade === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted">
        Trade not found, or you don&apos;t have access to it.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>
              {names.initiator} ↔ {names.counterparty}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                trade.status === "accepted"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : trade.status === "declined"
                    ? "bg-red-500/15 text-red-500"
                    : "bg-accent/15 text-accent"
              }`}
            >
              {trade.status}
            </span>
          </div>
        </div>
        <TradeActions
          tradeId={trade.id}
          counterpartyUid={trade.counterpartyUid}
          status={trade.status}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SideList title={`${names.initiator} gives`} items={initiatorItems} />
        <SideList title={`${names.counterparty} gives`} items={counterpartyItems} />
      </div>
    </div>
  );
}
