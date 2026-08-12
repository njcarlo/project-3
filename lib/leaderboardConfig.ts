import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_BATCH,
  LEADERBOARD_CONFIG_COLLECTION,
  LEADERBOARD_CONFIG_DOC,
} from "@/lib/leaderboard";

export interface LeaderboardConfig {
  activeBatch: string;
  batches: string[];
}

function configRef() {
  return adminDb
    .collection(LEADERBOARD_CONFIG_COLLECTION)
    .doc(LEADERBOARD_CONFIG_DOC);
}

/** Reads the active batch and known batch list; falls back to the default. */
export async function getLeaderboardConfig(): Promise<LeaderboardConfig> {
  const snap = await configRef().get();
  const data = snap.data();
  const activeBatch =
    data && typeof data.activeBatch === "string" && data.activeBatch.trim()
      ? data.activeBatch
      : DEFAULT_BATCH;
  const batches =
    data && Array.isArray(data.batches) && data.batches.length
      ? data.batches.map(String)
      : [activeBatch];
  if (!batches.includes(activeBatch)) batches.unshift(activeBatch);
  return { activeBatch, batches };
}

/**
 * The batch list for the dropdowns: active batch first, then the rest sorted
 * numerically ("Batch 2" before "Batch 10"). Reads only the config doc — no
 * full-collection scan — to keep Firestore reads minimal.
 */
export async function listAllBatches(): Promise<LeaderboardConfig> {
  const { activeBatch, batches } = await getLeaderboardConfig();
  const rest = batches
    .filter((b) => b !== activeBatch)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { activeBatch, batches: [activeBatch, ...rest] };
}

/** Creates (if new) and activates a batch. Atomic via arrayUnion. */
export async function setActiveBatch(name: string): Promise<LeaderboardConfig> {
  const clean = name.trim();
  if (!clean) throw new Error("Batch name is required.");
  await configRef().set(
    { activeBatch: clean, batches: FieldValue.arrayUnion(clean) },
    { merge: true }
  );
  return getLeaderboardConfig();
}
