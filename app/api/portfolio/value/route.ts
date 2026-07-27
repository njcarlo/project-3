import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { computePortfolioValue } from "@/lib/portfolio";

export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await computePortfolioValue(decoded.uid);
  return NextResponse.json(data);
}
