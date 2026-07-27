import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { analyzeTrade, type TradeSideInput } from "@/lib/tradeAnalysis";

export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const initiatorItems: TradeSideInput[] = body.initiatorItems ?? [];
  const counterpartyItems: TradeSideInput[] = body.counterpartyItems ?? [];

  const analysis = await analyzeTrade(initiatorItems, counterpartyItems);
  return NextResponse.json(analysis);
}
