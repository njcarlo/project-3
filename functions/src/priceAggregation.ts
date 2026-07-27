import * as functions from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const MAX_SAMPLES = 200;
const HISTORY_CAP = 30;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

interface HistoryEntry {
  date: string;
  avg: number;
  median: number;
}

// Recomputes priceAggregates/{catalogItemId} from the latest active
// submissions whenever a new one comes in. Trimmed mean guards against a
// single outlier submission; median is already robust to that on its own.
export const aggregatePriceSubmission = functions.firestore
  .document("priceSubmissions/{submissionId}")
  .onCreate(async (snap) => {
    const submission = snap.data();
    const catalogItemId = submission.catalogItemId as string | undefined;
    if (!catalogItemId) return;

    const db = getFirestore();

    const recentSnap = await db
      .collection("priceSubmissions")
      .where("catalogItemId", "==", catalogItemId)
      .where("status", "==", "active")
      .orderBy("submittedAt", "desc")
      .limit(MAX_SAMPLES)
      .get();

    const prices: number[] = [];
    let last90dSampleCount = 0;
    const now = Date.now();

    for (const doc of recentSnap.docs) {
      const data = doc.data();
      if (data.flagged) continue;
      const price = data.price as number;
      if (typeof price !== "number" || price <= 0) continue;
      prices.push(price);

      const submittedAtMs =
        typeof data.submittedAt?.toMillis === "function"
          ? data.submittedAt.toMillis()
          : null;
      if (submittedAtMs && now - submittedAtMs <= NINETY_DAYS_MS) {
        last90dSampleCount++;
      }
    }

    if (prices.length === 0) return;

    const sorted = [...prices].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * 0.05);
    const trimmed =
      trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted;
    const avg = trimmed.reduce((sum, p) => sum + p, 0) / trimmed.length;

    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sampleCount = prices.length;

    const aggregateRef = db.collection("priceAggregates").doc(catalogItemId);
    const aggregateDoc = await aggregateRef.get();
    const today = new Date().toISOString().slice(0, 10);
    const prevHistory: HistoryEntry[] = aggregateDoc.exists
      ? (aggregateDoc.data()?.history ?? [])
      : [];

    const history = [
      ...prevHistory.filter((h) => h.date !== today),
      { date: today, avg, median },
    ].slice(-HISTORY_CAP);

    await aggregateRef.set({
      catalogItemId,
      avg,
      median,
      min,
      max,
      sampleCount,
      last90dSampleCount,
      lastUpdated: FieldValue.serverTimestamp(),
      history,
    });

    await db.collection("catalogItems").doc(catalogItemId).set(
      {
        lastPriceAggregate: {
          avg,
          median,
          sampleCount,
          lastUpdated: Date.now(),
        },
      },
      { merge: true }
    );
  });
