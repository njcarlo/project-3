import type { DocumentSnapshot } from "firebase-admin/firestore";
import { DEFAULT_BATCH, type LeaderboardSubmission } from "@/lib/leaderboard";

function millis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === "number" ? value : 0;
}

/** Converts an Admin SDK snapshot into a JSON-safe LeaderboardSubmission. */
export function serializeSubmission(
  snap: DocumentSnapshot
): LeaderboardSubmission {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    name: String(data.name ?? ""),
    batch: typeof data.batch === "string" && data.batch ? data.batch : DEFAULT_BATCH,
    mediaUrl: String(data.mediaUrl ?? ""),
    mediaType:
      data.mediaType === "video"
        ? "video"
        : data.mediaType === "image"
          ? "image"
          : null,
    selfieUrl: String(data.selfieUrl ?? ""),
    qrUrl: String(data.qrUrl ?? ""),
    score: typeof data.score === "number" ? data.score : null,
    status: data.status === "scored" ? "scored" : "pending",
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  };
}
