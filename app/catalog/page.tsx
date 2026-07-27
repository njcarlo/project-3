import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem } from "@/lib/types";
import { QuickAddButton } from "@/components/QuickAddButton";
import { RarityBadge } from "@/components/RarityBadge";

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/catalog/${item.id}`}
              className="card group relative overflow-hidden rounded-xl p-3 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <QuickAddButton catalogItemId={item.id} />
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-background">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external PokeAPI/Storage images, not worth Image config for MVP
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                )}
              </div>
              <p className="mt-3 truncate text-sm font-medium">{item.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted">
                  {item.seriesName.replace("Mezastar ", "")} · #{item.number}
                </span>
                <RarityBadge rarity={item.rarity} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
