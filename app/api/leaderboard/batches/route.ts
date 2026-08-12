import { NextResponse } from "next/server";
import { listAllBatches } from "@/lib/leaderboardConfig";

// Public: the list of tournament batches and which one is active, for the
// leaderboard's batch dropdown.
export const dynamic = "force-dynamic";

export async function GET() {
  const { activeBatch, batches, closedBatches } = await listAllBatches();
  return NextResponse.json({ activeBatch, batches, closedBatches });
}
