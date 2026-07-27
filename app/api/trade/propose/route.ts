import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { analyzeTrade, type TradeSideInput } from "@/lib/tradeAnalysis";

export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const counterpartyUid: string | undefined = body.counterpartyUid;
  const initiatorItems: TradeSideInput[] = body.initiatorItems ?? [];
  const counterpartyItems: TradeSideInput[] = body.counterpartyItems ?? [];

  if (!counterpartyUid || counterpartyUid === decoded.uid) {
    return NextResponse.json({ error: "Invalid counterparty" }, { status: 400 });
  }
  if (initiatorItems.length === 0 && counterpartyItems.length === 0) {
    return NextResponse.json({ error: "Trade is empty" }, { status: 400 });
  }

  const analysis = await analyzeTrade(initiatorItems, counterpartyItems);

  const ref = await adminDb.collection("trades").add({
    initiatorUid: decoded.uid,
    counterpartyUid,
    initiatorItems: analysis.initiator.items,
    counterpartyItems: analysis.counterparty.items,
    fairnessScore: Number.isFinite(analysis.fairnessScore)
      ? analysis.fairnessScore
      : 999,
    status: "proposed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ tradeId: ref.id });
}
