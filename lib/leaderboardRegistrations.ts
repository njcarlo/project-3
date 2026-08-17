import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_BATCH,
  LEADERBOARD_REGISTRATIONS_COLLECTION,
  type Registration,
} from "@/lib/leaderboard";

function millis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === "number" ? value : 0;
}

export function serializeRegistration(snap: DocumentSnapshot): Registration {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    batch:
      typeof data.batch === "string" && data.batch ? data.batch : DEFAULT_BATCH,
    name: String(data.name ?? ""),
    contact: String(data.contact ?? ""),
    messenger: String(data.messenger ?? ""),
    qrUrl: String(data.qrUrl ?? ""),
    paymentProofUrl: String(data.paymentProofUrl ?? ""),
    paid: data.paid === true,
    uid: typeof data.uid === "string" && data.uid ? data.uid : null,
    adminNote: String(data.adminNote ?? ""),
    createdAt: millis(data.createdAt),
  };
}

/** All registrations for a batch (or all, if no batch given), newest first. */
export async function listRegistrations(batch?: string): Promise<Registration[]> {
  const col = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION);
  const snap = await (batch ? col.where("batch", "==", batch).get() : col.get());
  return snap.docs
    .map(serializeRegistration)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Distinct registered player names for a batch, alphabetical. */
export async function getRegisteredNames(batch: string): Promise<string[]> {
  const regs = await listRegistrations(batch);
  const names = new Set(regs.map((r) => r.name).filter(Boolean));
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** This player's registration for a batch, found via their account uid. */
export async function getRegistrationByUid(
  batch: string,
  uid: string
): Promise<Registration | null> {
  const snap = await adminDb
    .collection(LEADERBOARD_REGISTRATIONS_COLLECTION)
    .where("batch", "==", batch)
    .where("uid", "==", uid)
    .limit(1)
    .get();
  return snap.empty ? null : serializeRegistration(snap.docs[0]);
}
