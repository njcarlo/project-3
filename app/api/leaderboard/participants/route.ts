import { NextRequest, NextResponse } from "next/server";
import { getRegisteredNames } from "@/lib/leaderboardRegistrations";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";

// Public: registered player names for a batch (defaults to active), used to
// populate the submission form's name dropdown.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("batch");
  const batch = requested ?? (await getLeaderboardConfig()).activeBatch;
  const names = await getRegisteredNames(batch);
  return NextResponse.json({ batch, names });
}
