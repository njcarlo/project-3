"use client";

import type { Holding } from "@/lib/useUserHoldings";
import { RarityBadge } from "@/components/RarityBadge";

export function TradeSidePicker({
  title,
  holdings,
  selections,
  onChange,
}: {
  title: string;
  holdings: Holding[] | null;
  selections: Map<string, number>;
  onChange: (catalogItemId: string, quantity: number) => void;
}) {
  return (
    <div className="card rounded-xl p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      {holdings === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : holdings.length === 0 ? (
        <p className="text-sm text-muted">No items in this collection yet.</p>
      ) : (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {holdings.map(({ catalogItem, totalQuantity }) => {
            const selected = selections.get(catalogItem.id) ?? 0;
            return (
              <div
                key={catalogItem.id}
                className="flex items-center gap-2 rounded-lg border border-card-border p-2"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background">
                  {catalogItem.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catalogItem.imageUrl}
                      alt={catalogItem.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {catalogItem.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <RarityBadge rarity={catalogItem.rarity} />
                    <span className="text-xs text-muted">
                      own {totalQuantity}
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={totalQuantity}
                  value={selected}
                  onChange={(e) => {
                    const qty = Math.max(
                      0,
                      Math.min(totalQuantity, Number(e.target.value))
                    );
                    onChange(catalogItem.id, qty);
                  }}
                  className="w-14 rounded-lg border border-card-border bg-background px-2 py-1 text-center text-sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
