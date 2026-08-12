import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  LEADERBOARD_COLLECTION,
  MAX_MEDIA_BYTES,
  MAX_SELFIE_BYTES,
  MAX_QR_BYTES,
  isValidParticipant,
  type LeaderboardMediaType,
} from "@/lib/leaderboard";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";
import { getLeaderboardConfig } from "@/lib/leaderboardConfig";

// Uploads can be large (short videos), so give the handler room to run.
export const maxDuration = 60;

function mediaTypeFor(file: File): LeaderboardMediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

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
  const media = form.get("media");
  const selfie = form.get("selfie");
  const qr = form.get("qr");

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isValidParticipant(name)) {
    return NextResponse.json(
      { error: "Name must be one of the listed participants." },
      { status: 400 }
    );
  }
  const mediaFile = media instanceof File && media.size > 0 ? media : null;
  const selfieFile = selfie instanceof File && selfie.size > 0 ? selfie : null;
  const qrFile = qr instanceof File && qr.size > 0 ? qr : null;

  // Entry media and selfie are each optional, but at least one is required.
  if (!mediaFile && !selfieFile) {
    return NextResponse.json(
      { error: "Please upload at least a photo/video entry or a selfie." },
      { status: 400 }
    );
  }
  // The Trainer ID QR is always required, and must be an image.
  if (!qrFile) {
    return NextResponse.json(
      { error: "A Trainer ID QR photo is required." },
      { status: 400 }
    );
  }

  let mediaType: LeaderboardMediaType | null = null;
  if (mediaFile) {
    mediaType = mediaTypeFor(mediaFile);
    if (!mediaType) {
      return NextResponse.json(
        { error: "Entry must be an image or a video." },
        { status: 400 }
      );
    }
    if (mediaFile.size > MAX_MEDIA_BYTES) {
      return NextResponse.json(
        { error: "Entry file is too large (max 16 MB)." },
        { status: 400 }
      );
    }
  }
  if (selfieFile) {
    if (!selfieFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Selfie must be an image." },
        { status: 400 }
      );
    }
    if (selfieFile.size > MAX_SELFIE_BYTES) {
      return NextResponse.json(
        { error: "Selfie is too large (max 6 MB)." },
        { status: 400 }
      );
    }
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

  // New entries join the currently active tournament batch.
  const { activeBatch } = await getLeaderboardConfig();

  // Reserve the document id first so uploads land under a stable path.
  const ref = adminDb.collection(LEADERBOARD_COLLECTION).doc();

  const [mediaUrl, selfieUrl, qrUrl] = await Promise.all([
    mediaFile
      ? uploadLeaderboardFile(mediaFile, ref.id, "media")
      : Promise.resolve(""),
    selfieFile
      ? uploadLeaderboardFile(selfieFile, ref.id, "selfie")
      : Promise.resolve(""),
    uploadLeaderboardFile(qrFile, ref.id, "qr"),
  ]);

  await ref.set({
    name,
    batch: activeBatch,
    mediaUrl,
    mediaType,
    selfieUrl,
    qrUrl,
    score: null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
