import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import {
  LEADERBOARD_REGISTRATIONS_COLLECTION,
  MAX_QR_BYTES,
} from "@/lib/leaderboard";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";
import { getRegistrationByUid } from "@/lib/leaderboardRegistrations";

// A registrant uploads a screenshot proving they paid via the admin's
// payment QR. Requires their own account (set up at registration) — the
// registration to attach it to is found by account uid, not a client-passed
// id, so one player can't tamper with another's registration.
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const proof = form.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json(
      { error: "Please attach a payment screenshot." },
      { status: 400 }
    );
  }
  if (!proof.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Payment proof must be an image." },
      { status: 400 }
    );
  }
  if (proof.size > MAX_QR_BYTES) {
    return NextResponse.json(
      { error: "Payment proof is too large (max 6 MB)." },
      { status: 400 }
    );
  }

  const { activeBatch } = await getLeaderboardConfig();
  const registration = await getRegistrationByUid(activeBatch, decoded.uid);
  if (!registration) {
    return NextResponse.json(
      { error: "No registration found for your account." },
      { status: 400 }
    );
  }

  const url = await uploadLeaderboardFile(proof, `reg-${registration.id}`, "proof");

  await adminDb
    .collection(LEADERBOARD_REGISTRATIONS_COLLECTION)
    .doc(registration.id)
    .update({ paymentProofUrl: url });

  return NextResponse.json({ paymentProofUrl: url });
}
