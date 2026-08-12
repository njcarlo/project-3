import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_BATCH, LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";

// The public live leaderboard. Never cached, so it reflects the admin's
// latest scores.
export const dynamic = "force-dynamic";

interface HistoryItem {
  id: string;
  score: number;
  // Entry media is optional (a participant may have submitted only a selfie,
  // which stays private), so these can be empty/null.
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  at: number;
}

interface BoardEntry {
  name: string;
  // Best (highest) score — the only one that counts toward ranking.
  score: number;
  // Media for the best-scoring entry, shown on the board and when opened.
  // May be empty when the participant only submitted a (private) selfie.
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  // Every scored submission for this participant, newest first.
  history: HistoryItem[];
}

export async function GET(req: NextRequest) {
  // Which tournament batch to show — defaults to the active one.
  const requested = req.nextUrl.searchParams.get("batch");
  const batch = requested ?? (await getLeaderboardConfig()).activeBatch;

  const snap = await adminDb
    .collection(LEADERBOARD_COLLECTION)
    .where("status", "==", "scored")
    .get();

  // Group scored submissions by participant so only their highest score
  // ranks, while keeping the full score history for the detail view.
  const byName = new Map<string, BoardEntry>();

  for (const doc of snap.docs) {
    const s = serializeSubmission(doc);
    // Filter to the selected batch (treating legacy entries as the default).
    if ((s.batch || DEFAULT_BATCH) !== batch) continue;
    const score = s.score ?? 0;
    const item: HistoryItem = {
      id: s.id,
      score,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      at: s.updatedAt || s.createdAt,
    };

    const existing = byName.get(s.name);
    if (!existing) {
      byName.set(s.name, {
        name: s.name,
        score,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        history: [item],
      });
      continue;
    }

    existing.history.push(item);
    // Promote the best-scoring submission to the board-facing fields.
    if (score > existing.score) {
      existing.score = score;
      existing.mediaUrl = s.mediaUrl;
      existing.mediaType = s.mediaType;
    }
  }

  const entries = [...byName.values()]
    .map((e) => ({
      ...e,
      history: e.history.sort((a, b) => b.at - a.at),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return NextResponse.json({ entries, batch });
}
