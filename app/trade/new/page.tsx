"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserHoldings } from "@/lib/useUserHoldings";
import { TradeSidePicker } from "@/components/TradeSidePicker";

interface Counterparty {
  uid: string;
  displayName: string;
}

interface TradeAnalysisResponse {
  initiator: { total: number; minSampleCount: number };
  counterparty: { total: number; minSampleCount: number };
  fairnessScore: number;
  lowConfidence: boolean;
}

function selectionsToItems(selections: Map<string, number>) {
  return [...selections.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([catalogItemId, quantity]) => ({ catalogItemId, quantity }));
}

export default function NewTradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [mySelections, setMySelections] = useState<Map<string, number>>(
    new Map()
  );
  const [theirSelections, setTheirSelections] = useState<Map<string, number>>(
    new Map()
  );

  const myHoldings = useUserHoldings(user?.uid ?? null);
  const theirHoldings = useUserHoldings(counterparty?.uid ?? null);

  const [analysis, setAnalysis] = useState<TradeAnalysisResponse | null>(null);
  const [proposing, setProposing] = useState(false);

  const initiatorItems = selectionsToItems(mySelections);
  const counterpartyItems = selectionsToItems(theirSelections);

  useEffect(() => {
    if (!user || !counterparty) return;

    const handle = setTimeout(async () => {
      if (initiatorItems.length === 0 && counterpartyItems.length === 0) {
        setAnalysis(null);
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch("/api/trade/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ initiatorItems, counterpartyItems }),
      });
      if (res.ok) setAnalysis(await res.json());
    }, 400);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, counterparty, JSON.stringify(mySelections), JSON.stringify(theirSelections)]);

  async function handleFindCounterparty(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLookupError(null);
    setLookupBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/trade/counterparty?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error ?? "User not found");
        return;
      }
      setCounterparty(data);
    } finally {
      setLookupBusy(false);
    }
  }

  async function handlePropose() {
    if (!user || !counterparty) return;
    setProposing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/trade/propose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          counterpartyUid: counterparty.uid,
          initiatorItems,
          counterpartyItems,
        }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/trade/${data.tradeId}`);
    } finally {
      setProposing(false);
    }
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to propose a trade.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">New trade</h1>

      {!counterparty ? (
        <form
          onSubmit={handleFindCounterparty}
          className="card flex max-w-sm flex-col gap-3 rounded-xl p-5"
        >
          <label className="text-sm font-medium">
            Who are you trading with?
          </label>
          <input
            type="email"
            required
            placeholder="Their email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          {lookupError && (
            <p className="text-sm text-red-500">{lookupError}</p>
          )}
          <button
            type="submit"
            disabled={lookupBusy}
            className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground disabled:opacity-50"
          >
            {lookupBusy ? "Looking up..." : "Find collector"}
          </button>
        </form>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            Trading with{" "}
            <span className="font-medium text-foreground">
              {counterparty.displayName}
            </span>{" "}
            ·{" "}
            <button
              onClick={() => setCounterparty(null)}
              className="text-accent underline"
            >
              change
            </button>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <TradeSidePicker
              title="You give"
              holdings={myHoldings}
              selections={mySelections}
              onChange={(id, qty) =>
                setMySelections((prev) => {
                  const next = new Map(prev);
                  next.set(id, qty);
                  return next;
                })
              }
            />
            <TradeSidePicker
              title="You get"
              holdings={theirHoldings}
              selections={theirSelections}
              onChange={(id, qty) =>
                setTheirSelections((prev) => {
                  const next = new Map(prev);
                  next.set(id, qty);
                  return next;
                })
              }
            />
          </div>

          {analysis && (
            <div className="card mt-6 rounded-xl p-5">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted">You give</p>
                  <p className="text-lg font-bold">
                    ¥{Math.round(analysis.initiator.total).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted">Fairness</p>
                  <p
                    className={`text-lg font-bold ${
                      Number.isFinite(analysis.fairnessScore) &&
                      Math.abs(analysis.fairnessScore - 1) <= 0.1
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }`}
                  >
                    {Number.isFinite(analysis.fairnessScore)
                      ? `${(analysis.fairnessScore * 100).toFixed(0)}%`
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted">You get</p>
                  <p className="text-lg font-bold">
                    ¥{Math.round(analysis.counterparty.total).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-background">
                {(() => {
                  const total = analysis.initiator.total + analysis.counterparty.total;
                  const givePct = total > 0 ? (analysis.initiator.total / total) * 100 : 50;
                  return (
                    <>
                      <div className="h-2 bg-accent" style={{ width: `${givePct}%` }} />
                      <div
                        className="h-2 bg-emerald-400"
                        style={{ width: `${100 - givePct}%` }}
                      />
                    </>
                  );
                })()}
              </div>

              {analysis.lowConfidence && (
                <p className="mt-3 text-xs text-amber-500">
                  ⚠ Low price data on one or both sides — take this with a
                  grain of salt.
                </p>
              )}
            </div>
          )}

          <button
            onClick={handlePropose}
            disabled={
              proposing ||
              (initiatorItems.length === 0 && counterpartyItems.length === 0)
            }
            className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground disabled:opacity-50"
          >
            {proposing ? "Proposing..." : "Propose trade"}
          </button>
        </>
      )}
    </div>
  );
}
