import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { LEADERBOARD_REGISTRATIONS_COLLECTION } from "@/lib/leaderboard";
import {
  listRegistrations,
  serializeRegistration,
} from "@/lib/leaderboardRegistrations";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

export const dynamic = "force-dynamic";

// Admin: full registration list (name, contact, QR, paid status).
export async function GET(req: NextRequest) {
  if (!requestHasAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const registrations = await listRegistrations();
  return NextResponse.json({ registrations });
}

// Admin: confirm/unconfirm a registrant's tournament-fee payment.
export async function POST(req: NextRequest) {
  if (!requestHasAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const paid = body.paid === true;
  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  const ref = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  await ref.update({ paid, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ registration: serializeRegistration(await ref.get()) });
}
