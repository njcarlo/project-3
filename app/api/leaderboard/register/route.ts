import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  LEADERBOARD_REGISTRATIONS_COLLECTION,
  MAX_QR_BYTES,
} from "@/lib/leaderboard";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";
import { isValidUsername, usernameToEmail } from "@/lib/leaderboardUsername";

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
  const messenger = String(form.get("messenger") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
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
  if (messenger.length > 200) {
    return NextResponse.json(
      { error: "Messenger is too long." },
      { status: 400 }
    );
  }
  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3-24 characters: letters, numbers, and underscores only.",
      },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
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

  const { activeBatch, closedBatches } = await getLeaderboardConfig();
  if (closedBatches.includes(activeBatch)) {
    return NextResponse.json(
      { error: `${activeBatch} is closed and not accepting registrations.` },
      { status: 403 }
    );
  }

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

  // Create the player's own account. The synthetic email lets them sign in
  // with just a username + password; Firebase Auth's uniqueness check on
  // email doubles as the username-uniqueness check.
  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email: usernameToEmail(username),
      password,
      displayName: name,
    });
    uid = userRecord.uid;
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "That username is taken." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't create your account. Try a different username." },
      { status: 400 }
    );
  }

  const ref = adminDb.collection(LEADERBOARD_REGISTRATIONS_COLLECTION).doc();
  const qrUrl = await uploadLeaderboardFile(qrFile, `reg-${ref.id}`, "qr");

  await ref.set({
    batch: activeBatch,
    name,
    contact,
    messenger,
    qrUrl,
    paid: false,
    uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  // A custom token lets the client sign straight into this new account
  // without re-entering the password.
  const customToken = await adminAuth.createCustomToken(uid);

  return NextResponse.json(
    { id: ref.id, batch: activeBatch, customToken },
    { status: 201 }
  );
}
