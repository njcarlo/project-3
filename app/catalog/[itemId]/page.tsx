import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem, PriceAggregate } from "@/lib/types";
import { AddToCollectionForm } from "@/components/AddToCollectionForm";
import { SubmitPriceForm } from "@/components/SubmitPriceForm";
import { CryButton } from "@/components/CryButton";

export const dynamic = "force-dynamic";

async function getItem(itemId: string) {
  const doc = await adminDb.collection("catalogItems").doc(itemId).get();
  if (!doc.exists) return null;
  const item = { id: doc.id, ...doc.data() } as CatalogItem;
  if (item.status !== "approved") return null;

  const aggDoc = await adminDb.collection("priceAggregates").doc(itemId).get();
  const aggregate = aggDoc.exists ? (aggDoc.data() as PriceAggregate) : null;

  return { item, aggregate };
}

export default async function CatalogItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const data = await getItem(itemId);
  if (!data) notFound();
  const { item, aggregate } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="aspect-square w-full max-w-xs overflow-hidden rounded bg-black/5 dark:bg-white/5">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external PokeAPI/Storage images, not worth Image config for MVP
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <CryButton pokemonName={item.name} />
      </div>
      <p className="text-black/60 dark:text-white/60">
        {item.seriesName} · #{item.number} · {item.rarity}
      </p>

      <div className="mt-4 rounded border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-medium">Community price</h2>
        {aggregate ? (
          <p className="mt-1 text-sm">
            avg ¥{aggregate.avg.toLocaleString()} · median ¥
            {aggregate.median.toLocaleString()} · {aggregate.sampleCount}{" "}
            submission{aggregate.sampleCount === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            No price submissions yet — be the first.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <AddToCollectionForm catalogItemId={item.id} />
        <SubmitPriceForm catalogItemId={item.id} />
      </div>
    </div>
  );
}
