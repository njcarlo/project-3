"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/types";
import { QuickAddButton } from "@/components/QuickAddButton";
import { RarityBadge } from "@/components/RarityBadge";

type View = "grid" | "layout";

// series-01 -> 0, series-02 -> 1, series-03 -> 2, unknown series pushed last.
function seriesRank(seriesId: string): number {
  const match = seriesId.match(/(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

// Superstars (black-6) surface first, ordered v1 -> v2 -> v3, then everything
// else keeps its normal series/number order.
function withSuperstarsFirst(items: CatalogItem[]): CatalogItem[] {
  const superstars = items
    .filter((item) => item.rarity === "black-6")
    .sort((a, b) => seriesRank(a.seriesId) - seriesRank(b.seriesId));
  const rest = items.filter((item) => item.rarity !== "black-6");
  return [...superstars, ...rest];
}

function PriceTag({ item }: { item: CatalogItem }) {
  const avg = item.lastPriceAggregate?.avg;
  if (avg == null) {
    return <span className="text-xs text-muted">No price yet</span>;
  }
  return (
    <span className="text-sm font-semibold">
      ₱{Math.round(avg).toLocaleString()}
    </span>
  );
}

export function CatalogBrowser({ items }: { items: CatalogItem[] }) {
  const [view, setView] = useState<View>("grid");
  const sorted = useMemo(() => withSuperstarsFirst(items), [items]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full border border-card-border p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`rounded-full px-3 py-1 transition-colors ${
              view === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("layout")}
            className={`rounded-full px-3 py-1 transition-colors ${
              view === "layout"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Layout
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((item) => (
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
              <div className="mt-1">
                <PriceTag item={item} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-card-border overflow-hidden rounded-xl">
          {sorted.map((item) => (
            <Link
              key={item.id}
              href={`/catalog/${item.id}`}
              className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external PokeAPI/Storage images
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-contain p-1"
                    loading="lazy"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.seriesName.replace("Mezastar ", "")} · #{item.number}
                </p>
              </div>

              <div className="w-20 shrink-0 text-right">
                <PriceTag item={item} />
              </div>

              <RarityBadge rarity={item.rarity} />

              <QuickAddButton catalogItemId={item.id} inline />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
