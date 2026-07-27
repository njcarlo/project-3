import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem, PriceAggregate, UserCollectionItem } from "@/lib/types";

export interface PortfolioValue {
  totalItems: number;
  totalValue: number;
  byRarity: { rarity: string; value: number }[];
  bySeries: { series: string; value: number }[];
  topItems: { catalogItemId: string; name: string; imageUrl: string; value: number }[];
}

export async function computePortfolioValue(uid: string): Promise<PortfolioValue> {
  const itemsSnap = await adminDb
    .collection("userCollections")
    .doc(uid)
    .collection("items")
    .get();
  const items = itemsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as UserCollectionItem
  );

  if (items.length === 0) {
    return { totalItems: 0, totalValue: 0, byRarity: [], bySeries: [], topItems: [] };
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
  const itemValues: PortfolioValue["topItems"] = [];

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
      itemValues.push({
        catalogItemId: catalog.id,
        name: catalog.name,
        imageUrl: catalog.imageUrl,
        value,
      });
    }
  });

  return {
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
    topItems: itemValues.sort((a, b) => b.value - a.value).slice(0, 8),
  };
}
