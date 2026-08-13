"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type {
  CatalogItem,
  CollectionSession,
  UserCollectionItem,
} from "@/lib/types";
import { RarityBadge } from "@/components/RarityBadge";
import { PinShowcaseButton } from "@/components/PinShowcaseButton";

interface Row extends UserCollectionItem {
  catalogItem: CatalogItem | null;
}

const NO_SESSION = "__none__";

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sessions, setSessions] = useState<CollectionSession[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      collection(db, "userCollections", user.uid, "items"),
      async (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as UserCollectionItem
        );

        const catalogItems = await Promise.all(
          items.map(async (item) => {
            const catalogSnap = await getDoc(
              doc(db, "catalogItems", item.catalogItemId)
            );
            return catalogSnap.exists()
              ? ({ id: catalogSnap.id, ...catalogSnap.data() } as CatalogItem)
              : null;
          })
        );

        setRows(
          items.map((item, i) => ({ ...item, catalogItem: catalogItems[i] }))
        );
      }
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      collection(db, "userCollections", user.uid, "sessions"),
      (snap) => {
        setSessions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CollectionSession)
        );
      }
    );
  }, [user]);

  async function updateQuantity(itemId: string, quantity: number) {
    if (!user || quantity < 1) return;
    await updateDoc(doc(db, "userCollections", user.uid, "items", itemId), {
      quantity,
      updatedAt: serverTimestamp(),
    });
  }

  async function removeItem(itemId: string) {
    if (!user) return;
    await deleteDoc(doc(db, "userCollections", user.uid, "items", itemId));
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to see your collection.
        </p>
      </div>
    );
  }

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const groups = new Map<string, Row[]>();
  for (const row of rows ?? []) {
    const key = row.sessionId ?? NO_SESSION;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const orderedKeys = [
    ...sessions.map((s) => s.id).filter((id) => groups.has(id)),
    ...(groups.has(NO_SESSION) ? [NO_SESSION] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        My collection
      </h1>

      {rows === null ? (
        <p className="text-muted">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">
          Nothing here yet.{" "}
          <Link href="/catalog" className="text-accent underline">
            Browse the catalog
          </Link>{" "}
          to add items.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {orderedKeys.map((key) => {
            const groupRows = groups.get(key)!;
            const session = key === NO_SESSION ? null : sessionById.get(key);
            const itemCount = groupRows.reduce((n, r) => n + r.quantity, 0);
            const costPerTag =
              session?.cost != null && itemCount > 0
                ? session.cost / itemCount
                : null;

            return (
              <section key={key} className="card overflow-hidden rounded-xl">
                <div className="flex items-baseline justify-between border-b border-card-border px-4 py-3">
                  <h2 className="font-semibold">
                    {session ? session.label : "No session"}
                  </h2>
                  <div className="text-xs text-muted">
                    {session?.date && <span>{session.date} · </span>}
                    {session?.cost != null && (
                      <span>
                        ₱{session.cost.toLocaleString()} total
                        {costPerTag != null &&
                          ` · ₱${costPerTag.toFixed(0)}/tag`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-card-border">
                  {groupRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                        {row.catalogItem?.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.catalogItem.imageUrl}
                            alt={row.catalogItem.name}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {row.catalogItem ? (
                          <Link
                            href={`/catalog/${row.catalogItem.id}`}
                            className="truncate font-medium hover:text-accent"
                          >
                            {row.catalogItem.name}
                          </Link>
                        ) : (
                          <span className="text-muted">Unknown item</span>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          {row.catalogItem && (
                            <RarityBadge rarity={row.catalogItem.rarity} />
                          )}
                          <span className="text-xs capitalize text-muted">
                            {row.condition}
                          </span>
                        </div>
                      </div>

                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateQuantity(row.id, Number(e.target.value))
                        }
                        className="w-14 rounded-lg border border-card-border bg-background px-2 py-1 text-center text-sm"
                      />

                      {row.catalogItem && (
                        <PinShowcaseButton
                          catalogItemId={row.catalogItem.id}
                        />
                      )}

                      <button
                        onClick={() => removeItem(row.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
