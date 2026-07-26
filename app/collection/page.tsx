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
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p>
          <Link href="/login" className="underline">
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">My collection</h1>

      {rows === null ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Nothing here yet.{" "}
          <Link href="/catalog" className="underline">
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
              <section key={key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-medium">
                    {session ? session.label : "No session"}
                  </h2>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {session?.date && <span>{session.date} · </span>}
                    {session?.cost != null && (
                      <span>
                        ¥{session.cost.toLocaleString()} total
                        {costPerTag != null &&
                          ` · ¥${costPerTag.toFixed(0)}/tag`}
                      </span>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left dark:border-white/10">
                      <th className="py-2">Item</th>
                      <th className="py-2">Condition</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-black/5 dark:border-white/5"
                      >
                        <td className="py-2">
                          {row.catalogItem ? (
                            <Link
                              href={`/catalog/${row.catalogItem.id}`}
                              className="underline"
                            >
                              {row.catalogItem.name}
                            </Link>
                          ) : (
                            "Unknown item"
                          )}
                        </td>
                        <td className="py-2 capitalize">{row.condition}</td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) =>
                              updateQuantity(row.id, Number(e.target.value))
                            }
                            className="w-16 rounded border border-black/20 px-1 dark:border-white/20"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeItem(row.id)}
                            className="text-red-600 underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
