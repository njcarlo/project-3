import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_BATCH, LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";
import { listAllBatches } from "@/lib/leaderboardConfig";

// Public: a catalog of tournaments (batches) with a summary for each — the top
// 5 players and the champion's selfie.
export const dynamic = "force-dynamic";

interface TopPlayer {
  name: string;
  score: number;
}

interface TournamentSummary {
  batch: string;
  active: boolean;
  open: boolean;
  participants: number;
  top: TopPlayer[];
  // The #1 player's selfie (shown on the catalog), if they submitted one.
  championSelfieUrl: string | null;
}

export async function GET() {
  const { activeBatch, batches, closedBatches } = await listAllBatches();

  // batch -> (player name -> best score + that entry's selfie)
  const perBatch = new Map<
    string,
    Map<string, { score: number; selfieUrl: string }>
  >();
  for (const b of batches) perBatch.set(b, new Map());

  const snap = await adminDb
    .collection(LEADERBOARD_COLLECTION)
    .where("status", "==", "scored")
    .get();

  for (const doc of snap.docs) {
    const s = serializeSubmission(doc);
    const b = s.batch || DEFAULT_BATCH;
    const players = perBatch.get(b) ?? new Map();
    if (!perBatch.has(b)) perBatch.set(b, players);
    const score = s.score ?? 0;
    const existing = players.get(s.name);
    if (!existing || score > existing.score) {
      players.set(s.name, { score, selfieUrl: s.selfieUrl });
    }
  }

  const tournaments: TournamentSummary[] = [...perBatch.entries()].map(
    ([batch, players]) => {
      const ranked = [...players.entries()]
        .map(([name, v]) => ({ name, score: v.score, selfieUrl: v.selfieUrl }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      return {
        batch,
        active: batch === activeBatch,
        open: !closedBatches.includes(batch),
        participants: players.size,
        top: ranked.slice(0, 5).map(({ name, score }) => ({ name, score })),
        championSelfieUrl: ranked[0]?.selfieUrl || null,
      };
    }
  );

  tournaments.sort((a, b) =>
    a.active === b.active
      ? a.batch.localeCompare(b.batch, undefined, { numeric: true })
      : a.active
        ? -1
        : 1
  );

  return NextResponse.json({ tournaments, activeBatch });
}
