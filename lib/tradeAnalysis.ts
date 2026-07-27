import { adminDb } from "@/lib/firebase/admin";
import type { PriceAggregate, TradeSideItem } from "@/lib/types";

export interface TradeSideInput {
  catalogItemId: string;
  quantity: number;
}

interface AnalyzedSide {
  items: TradeSideItem[];
  total: number;
  // Lowest sampleCount among this side's items; Infinity if side is empty.
  minSampleCount: number;
}

export interface TradeAnalysis {
  initiator: AnalyzedSide;
  counterparty: AnalyzedSide;
  // initiatorTotal / counterpartyTotal. 1.0 = even. >1 = initiator is giving
  // more value, <1 = initiator is giving less.
  fairnessScore: number;
  // True if either side has an item with fewer than 3 price submissions —
  // the fairness score is only as good as the data behind it.
  lowConfidence: boolean;
}

async function analyzeSide(items: TradeSideInput[]): Promise<AnalyzedSide> {
  if (items.length === 0) {
    return { items: [], total: 0, minSampleCount: Infinity };
  }

  const refs = items.map((i) =>
    adminDb.collection("priceAggregates").doc(i.catalogItemId)
  );
  // getAll() has no 10-item cap unlike an `in` query, so this scales fine
  // for a reasonably sized trade.
  const snaps = await adminDb.getAll(...refs);

  let total = 0;
  let minSampleCount = Infinity;

  const sideItems: TradeSideItem[] = items.map((item, i) => {
    const agg = snaps[i].exists ? (snaps[i].data() as PriceAggregate) : null;
    const avg = agg?.avg ?? 0;
    const sampleCount = agg?.sampleCount ?? 0;
    total += avg * item.quantity;
    minSampleCount = Math.min(minSampleCount, sampleCount);
    return {
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
      valueAtProposal: avg,
    };
  });

  return { items: sideItems, total, minSampleCount };
}

export async function analyzeTrade(
  initiatorItems: TradeSideInput[],
  counterpartyItems: TradeSideInput[]
): Promise<TradeAnalysis> {
  const [initiator, counterparty] = await Promise.all([
    analyzeSide(initiatorItems),
    analyzeSide(counterpartyItems),
  ]);

  const fairnessScore =
    counterparty.total > 0
      ? initiator.total / counterparty.total
      : initiator.total > 0
        ? Infinity
        : 1;

  const lowConfidence =
    (initiator.minSampleCount !== Infinity && initiator.minSampleCount < 3) ||
    (counterparty.minSampleCount !== Infinity &&
      counterparty.minSampleCount < 3);

  return { initiator, counterparty, fairnessScore, lowConfidence };
}
