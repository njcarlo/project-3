import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import type { CatalogItem, PriceAggregate, UserCollectionItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemsSnap = await adminDb
    .collection("userCollections")
    .doc(decoded.uid)
    .collection("items")
    .get();
  const items = itemsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as UserCollectionItem
  );

  if (items.length === 0) {
    return NextResponse.json({
      totalItems: 0,
      totalValue: 0,
      byRarity: [],
      bySeries: [],
    });
  }

  const catalogRefs = items.map((i) =>
    adminDb.collection("catalogItems").doc(i.catalogItemId)
  );
  const aggregateRefs = items.map((i) =>
    adminDb.collection("priceAggregates").doc(i.catalogItemId)
  );

  const [catalogSnaps, aggregateSnaps] = await Promise.all([
    adminDb.getAll(...catalogRefs),
    adminDb.getAll(...aggregateRefs),
  ]);

  let totalValue = 0;
  let totalItems = 0;
  const rarityTotals = new Map<string, number>();
  const seriesTotals = new Map<string, number>();

  items.forEach((item, i) => {
    const catalog = catalogSnaps[i].exists
      ? (catalogSnaps[i].data() as CatalogItem)
      : null;
    const aggregate = aggregateSnaps[i].exists
      ? (aggregateSnaps[i].data() as PriceAggregate)
      : null;
    const unitValue = aggregate?.avg ?? 0;
    const value = unitValue * item.quantity;

    totalValue += value;
    totalItems += item.quantity;

    if (catalog) {
      rarityTotals.set(
        catalog.rarity,
        (rarityTotals.get(catalog.rarity) ?? 0) + value
      );
      seriesTotals.set(
        catalog.seriesName,
        (seriesTotals.get(catalog.seriesName) ?? 0) + value
      );
    }
  });

  return NextResponse.json({
    totalItems,
    totalValue,
    byRarity: [...rarityTotals.entries()].map(([rarity, value]) => ({
      rarity,
      value,
    })),
    bySeries: [...seriesTotals.entries()].map(([series, value]) => ({
      series,
      value,
    })),
  });
}
