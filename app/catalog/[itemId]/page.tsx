import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import type { CatalogItem, PriceAggregate } from "@/lib/types";
import { AddToCollectionForm } from "@/components/AddToCollectionForm";
import { SubmitPriceForm } from "@/components/SubmitPriceForm";
import { CryButton } from "@/components/CryButton";
import { RarityBadge } from "@/components/RarityBadge";

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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="card aspect-square overflow-hidden rounded-2xl">
          {item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external PokeAPI/Storage images, not worth Image config for MVP
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-contain p-6"
            />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <RarityBadge rarity={item.rarity} />
            <span className="text-xs text-muted">
              {item.seriesName} · #{item.number}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
            <CryButton pokemonName={item.name} />
          </div>

          <div className="card mt-6 rounded-xl p-4">
            <h2 className="text-xs font-medium uppercase text-muted">
              Community price
            </h2>
            {aggregate ? (
              <div className="mt-2 flex items-baseline gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    ₱{aggregate.avg.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">average</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    ₱{aggregate.median.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">median</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {aggregate.sampleCount}
                  </p>
                  <p className="text-xs text-muted">
                    submission{aggregate.sampleCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">
                No price submissions yet — be the first.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <AddToCollectionForm catalogItemId={item.id} />
            <SubmitPriceForm catalogItemId={item.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
