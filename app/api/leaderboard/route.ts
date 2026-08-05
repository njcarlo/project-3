import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";

// The public live leaderboard: scored entries ranked high-to-low. Never
// cached, so the page reflects the admin's latest scores.
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await adminDb
    .collection(LEADERBOARD_COLLECTION)
    .where("status", "==", "scored")
    .get();

  const entries = snap.docs
    .map(serializeSubmission)
    // Expose only what the public leaderboard needs — no selfies.
    .map(({ id, name, mediaUrl, mediaType, score }) => ({
      id,
      name,
      mediaUrl,
      mediaType,
      score: score ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return NextResponse.json({ entries });
}
