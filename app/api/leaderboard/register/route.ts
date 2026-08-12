import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  LEADERBOARD_REGISTRATIONS_COLLECTION,
  MAX_QR_BYTES,
} from "@/lib/leaderboard";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";

export const maxDuration = 60;

// Public: register a player for the active tournament (name + contact + QR).
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const name = String(form.get("name") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim();
  const qr = form.get("qr");
  const qrFile = qr instanceof File && qr.size > 0 ? qr : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  if (!contact) {
    return NextResponse.json(
      { error: "An email or phone number is required." },
      { status: 400 }
    );
  }
  if (contact.length > 120) {
    return NextResponse.json({ error: "Contact is too long." }, { status: 400 });
  }
  if (!qrFile) {
    return NextResponse.json(
      { error: "A Trainer ID QR photo is required." },
      { status: 400 }
    );
  }
  if (!qrFile.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Trainer ID QR must be an image." },
      { status: 400 }
    );
  }
  if (qrFile.size > MAX_QR_BYTES) {
    return NextResponse.json(
      { error: "Trainer ID QR is too large (max 6 MB)." },
      { status: 400 }
    );
  }

  const { activeBatch } = await getLeaderboardConfig();

  // Prevent duplicate registration of the same name in the active batch.
  const existing = await adminDb
    .collection(LEADERBOARD_REGISTRATIONS_COLLECTION)
    .where("batch", "==", activeBatch)
    .where("name", "==", name)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json(
      { error: `"${name}" is already registered for ${activeBatch}.` },
      { status: 409 }
    );
  }

  const ref = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION).doc();
  const qrUrl = await uploadLeaderboardFile(qrFile, `reg-${ref.id}`, "qr");

  await ref.set({
    batch: activeBatch,
    name,
    contact,
    qrUrl,
    paid: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id, batch: activeBatch }, { status: 201 });
}
