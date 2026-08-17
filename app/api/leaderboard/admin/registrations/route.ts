import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { LEADERBOARD_REGISTRATIONS_COLLECTION } from "@/lib/leaderboard";
import {
  listRegistrations,
  serializeRegistration,
} from "@/lib/leaderboardRegistrations";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

export const dynamic = "force-dynamic";

// Admin: full registration list (name, contact, QR, paid status).
export async function GET(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const registrations = await listRegistrations();
  return NextResponse.json({ registrations });
}

// Admin: confirm/unconfirm a registrant's tournament-fee payment, and/or set
// an admin-only note (e.g. "Contacted, pending payment"). Only fields
// actually present in the body are updated.
export async function POST(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if ("paid" in body) update.paid = body.paid === true;
  if ("adminNote" in body) {
    const note = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
    if (note.length > 500) {
      return NextResponse.json({ error: "Note is too long." }, { status: 400 });
    }
    update.adminNote = note;
  }

  const ref = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  await ref.update(update);
  return NextResponse.json({ registration: serializeRegistration(await ref.get()) });
}

// Admin: remove a registration (and its uploaded QR/payment-proof files).
// Does not touch the player's login account or any leaderboard entries
// they've already submitted.
export async function DELETE(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  const ref = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  await ref.delete();
  try {
    await adminStorage.bucket().deleteFiles({ prefix: `leaderboard/reg-${id}/` });
  } catch {
    // Files may already be gone; the registration is deleted regardless.
  }

  return NextResponse.json({ ok: true });
}
