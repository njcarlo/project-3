import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem, PriceAggregate, UserCollectionItem } from "@/lib/types";

export interface ShowcaseItem {
  catalogItemId: string;
  name: string;
  imageUrl: string;
  rarity: string;
}

export interface PortfolioValue {
  totalItems: number;
  totalValue: number;
  byRarity: { rarity: string; value: number }[];
  bySeries: { series: string; value: number }[];
  topItems: (ShowcaseItem & { value: number })[];
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
        rarity: catalog.rarity,
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

// Items a collector has pinned to their public showcase (users/{uid}.showcaseItemIds),
// shown ahead of the auto-ranked top-value items when present.
export async function resolveShowcaseItems(
  catalogItemIds: string[]
): Promise<ShowcaseItem[]> {
  if (catalogItemIds.length === 0) return [];

  const refs = catalogItemIds.map((id) =>
    adminDb.collection("catalogItems").doc(id)
  );
  const snaps = await adminDb.getAll(...refs);

  return snaps
    .filter((s) => s.exists)
    .map((s) => {
      const d = s.data() as CatalogItem;
      return {
        catalogItemId: d.id,
        name: d.name,
        imageUrl: d.imageUrl,
        rarity: d.rarity,
      };
    });
}
