"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";

interface Breakdown {
  value: number;
}

interface PortfolioValue {
  totalItems: number;
  totalValue: number;
  byRarity: (Breakdown & { rarity: string })[];
  bySeries: (Breakdown & { series: string })[];
}

function BreakdownBars<T extends Breakdown>({
  rows,
  labelKey,
}: {
  rows: T[];
  labelKey: keyof T;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((row) => (
        <div
          key={String(row[labelKey])}
          className="flex items-center gap-2 text-sm"
        >
          <span className="w-28 shrink-0 capitalize">
            {String(row[labelKey])}
          </span>
          <div className="h-2 flex-1 rounded bg-black/5 dark:bg-white/10">
            <div
              className="h-2 rounded bg-black dark:bg-white"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-black/60 dark:text-white/60">
            ¥{Math.round(row.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<PortfolioValue | null>(null);

  useEffect(() => {
    if (!user) return;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/portfolio/value", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => res.json())
      .then(setData);
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to see your portfolio value.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>

      {!data ? (
        <p>Loading...</p>
      ) : data.totalItems === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Your collection is empty.{" "}
          <Link href="/catalog" className="underline">
            Browse the catalog
          </Link>{" "}
          to add items.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex gap-8">
            <div>
              <p className="text-xs uppercase text-black/50 dark:text-white/50">
                Total value
              </p>
              <p className="text-2xl font-semibold">
                ¥{Math.round(data.totalValue).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-black/50 dark:text-white/50">
                Items
              </p>
              <p className="text-2xl font-semibold">{data.totalItems}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-black/50 dark:text-white/50">
                Avg per item
              </p>
              <p className="text-2xl font-semibold">
                ¥
                {Math.round(
                  data.totalValue / data.totalItems
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {data.byRarity.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">Value by rarity</h2>
              <BreakdownBars rows={data.byRarity} labelKey="rarity" />
            </div>
          )}

          {data.bySeries.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium">Value by series</h2>
              <BreakdownBars rows={data.bySeries} labelKey="series" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
