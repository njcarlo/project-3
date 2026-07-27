"use client";

import { useEffect, useState } from "react";
import { collection, getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CatalogItem, UserCollectionItem } from "@/lib/types";

export interface Holding {
  catalogItem: CatalogItem;
  totalQuantity: number;
}

// Aggregates a user's collection items by catalogItemId (a user can own the
// same tag across multiple sessions) so trade pickers work off "how many of
// this tag do they own" rather than individual collection-row ids.
export function useUserHoldings(uid: string | null): Holding[] | null {
  const [holdings, setHoldings] = useState<Holding[] | null>(null);

  useEffect(() => {
    if (!uid) return;

    return onSnapshot(
      collection(db, "userCollections", uid, "items"),
      async (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as UserCollectionItem
        );

        const totals = new Map<string, number>();
        for (const item of items) {
          totals.set(
            item.catalogItemId,
            (totals.get(item.catalogItemId) ?? 0) + item.quantity
          );
        }

        const entries = await Promise.all(
          [...totals.entries()].map(async ([catalogItemId, totalQuantity]) => {
            const catalogSnap = await getDoc(doc(db, "catalogItems", catalogItemId));
            if (!catalogSnap.exists()) return null;
            return {
              catalogItem: {
                id: catalogSnap.id,
                ...catalogSnap.data(),
              } as CatalogItem,
              totalQuantity,
            };
          })
        );

        setHoldings(entries.filter((e): e is Holding => e !== null));
      }
    );
  }, [uid]);

  return holdings;
}
