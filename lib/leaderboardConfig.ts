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
  // Batches that are closed (no longer accepting entries).
  closedBatches: string[];
  // Admin's payment QR code (e.g. GCash/bank InstaPay), shown to registrants
  // so they can pay directly instead of messaging the organizer.
  paymentQrUrl: string | null;
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
  const closedBatches =
    data && Array.isArray(data.closedBatches)
      ? data.closedBatches.map(String)
      : [];
  const paymentQrUrl =
    data && typeof data.paymentQrUrl === "string" && data.paymentQrUrl
      ? data.paymentQrUrl
      : null;
  return { activeBatch, batches, closedBatches, paymentQrUrl };
}

/**
 * The batch list for the dropdowns: active batch first, then the rest sorted
 * numerically ("Batch 2" before "Batch 10"). Reads only the config doc — no
 * full-collection scan — to keep Firestore reads minimal.
 */
export async function listAllBatches(): Promise<LeaderboardConfig> {
  const { activeBatch, batches, closedBatches, paymentQrUrl } =
    await getLeaderboardConfig();
  const rest = batches
    .filter((b) => b !== activeBatch)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return {
    activeBatch,
    batches: [activeBatch, ...rest],
    closedBatches,
    paymentQrUrl,
  };
}

/** Opens or closes a batch for new entries. */
export async function setBatchOpen(
  name: string,
  open: boolean
): Promise<LeaderboardConfig> {
  const clean = name.trim();
  if (!clean) throw new Error("Batch name is required.");
  await configRef().set(
    {
      closedBatches: open
        ? FieldValue.arrayRemove(clean)
        : FieldValue.arrayUnion(clean),
    },
    { merge: true }
  );
  return getLeaderboardConfig();
}

/** Whether a batch is currently accepting entries. */
export async function isBatchOpen(name: string): Promise<boolean> {
  const { closedBatches } = await getLeaderboardConfig();
  return !closedBatches.includes(name);
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

/** Sets (or clears, with null) the admin's payment QR image URL. */
export async function setPaymentQrUrl(
  url: string | null
): Promise<LeaderboardConfig> {
  await configRef().set({ paymentQrUrl: url }, { merge: true });
  return getLeaderboardConfig();
}
