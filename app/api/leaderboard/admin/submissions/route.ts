import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

export const dynamic = "force-dynamic";

// Full review feed for the admin dashboard: every submission, including
// selfies, newest first.
export async function GET(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection(LEADERBOARD_COLLECTION).get();
  const submissions = snap.docs
    .map(serializeSubmission)
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ submissions });
}
