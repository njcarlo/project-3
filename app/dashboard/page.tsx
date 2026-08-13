"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PortfolioShareControls } from "@/components/PortfolioShareControls";
import { BreakdownBars } from "@/components/BreakdownBars";
import { StatCard } from "@/components/StatCard";

interface Breakdown {
  value: number;
}

interface PortfolioValue {
  totalItems: number;
  totalValue: number;
  byRarity: (Breakdown & { rarity: string })[];
  bySeries: (Breakdown & { series: string })[];
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to see your portfolio value.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <PortfolioShareControls />
      </div>

      {!data ? (
        <p className="text-muted">Loading...</p>
      ) : data.totalItems === 0 ? (
        <p className="text-muted">
          Your collection is empty.{" "}
          <Link href="/catalog" className="text-accent underline">
            Browse the catalog
          </Link>{" "}
          to add items.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row">
            <StatCard
              label="Total value"
              value={`₱${Math.round(data.totalValue).toLocaleString()}`}
            />
            <StatCard label="Items" value={String(data.totalItems)} />
            <StatCard
              label="Avg per item"
              value={`₱${Math.round(
                data.totalValue / data.totalItems
              ).toLocaleString()}`}
            />
          </div>

          {data.byRarity.length > 0 && (
            <div className="card rounded-xl p-5">
              <h2 className="mb-4 text-sm font-semibold">Value by rarity</h2>
              <BreakdownBars rows={data.byRarity} labelKey="rarity" colorByRarity />
            </div>
          )}

          {data.bySeries.length > 0 && (
            <div className="card rounded-xl p-5">
              <h2 className="mb-4 text-sm font-semibold">Value by series</h2>
              <BreakdownBars rows={data.bySeries} labelKey="series" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
