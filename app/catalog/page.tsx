import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem } from "@/lib/types";

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Catalog</h1>

      {items.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          No catalog items yet. Run <code>npm run seed</code> after adding
          real Mezastar data to <code>seed/series-01.json</code>.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/catalog/${item.id}`}
              className="rounded border border-black/10 p-3 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
            >
              <div className="aspect-square w-full rounded bg-black/5 dark:bg-white/5" />
              <p className="mt-2 text-sm font-medium">{item.name}</p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {item.seriesName} · #{item.number} · {item.rarity}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
