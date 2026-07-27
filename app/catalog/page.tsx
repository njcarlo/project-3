import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem } from "@/lib/types";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export const dynamic = "force-dynamic";

async function getApprovedItems(): Promise<CatalogItem[]> {
  const snap = await adminDb
    .collection("catalogItems")
    .where("status", "==", "approved")
    .orderBy("seriesId")
    .orderBy("number")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CatalogItem);
}

export default async function CatalogPage() {
  const items = await getApprovedItems();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
        <p className="mt-1 text-muted">
          {items.length} tags across the Stardust series.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">
          No catalog items yet. Run <code>npm run seed</code> after adding
          real Mezastar data to <code>seed/series-01.json</code>.
        </p>
      ) : (
        <CatalogBrowser items={items} />
      )}
    </div>
  );
}
