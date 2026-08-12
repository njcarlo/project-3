import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_BATCH, LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";
import { listAllBatches } from "@/lib/leaderboardConfig";

// Public: a catalog of tournaments (batches) with a summary for each —
// participant count and the current winner.
export const dynamic = "force-dynamic";

interface TournamentSummary {
  batch: string;
  active: boolean;
  participants: number;
  scoredCount: number;
  winner: { name: string; score: number } | null;
}

export async function GET() {
  const { activeBatch, batches } = await listAllBatches();

  const stats = new Map<
    string,
    { names: Set<string>; scored: number; best: { name: string; score: number } | null }
  >();
  // Seed with known batches so empty tournaments still appear.
  for (const b of batches) stats.set(b, { names: new Set(), scored: 0, best: null });

  const snap = await adminDb
    .collection(LEADERBOARD_COLLECTION)
    .where("status", "==", "scored")
    .get();

  for (const doc of snap.docs) {
    const s = serializeSubmission(doc);
    const b = s.batch || DEFAULT_BATCH;
    const entry =
      stats.get(b) ?? { names: new Set<string>(), scored: 0, best: null };
    entry.names.add(s.name);
    entry.scored += 1;
    const score = s.score ?? 0;
    if (!entry.best || score > entry.best.score) {
      entry.best = { name: s.name, score };
    }
    stats.set(b, entry);
  }

  const tournaments: TournamentSummary[] = [...stats.entries()].map(
    ([batch, v]) => ({
      batch,
      active: batch === activeBatch,
      participants: v.names.size,
      scoredCount: v.scored,
      winner: v.best,
    })
  );

  // Active first, then numerically ("Batch 2" before "Batch 10").
  tournaments.sort((a, b) =>
    a.active === b.active
      ? a.batch.localeCompare(b.batch, undefined, { numeric: true })
      : a.active
        ? -1
        : 1
  );

  return NextResponse.json({ tournaments, activeBatch });
}
