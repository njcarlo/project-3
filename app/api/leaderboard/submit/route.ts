import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  LEADERBOARD_COLLECTION,
  MAX_MEDIA_BYTES,
  MAX_SELFIE_BYTES,
  isValidParticipant,
  type LeaderboardMediaType,
} from "@/lib/leaderboard";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";

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

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isValidParticipant(name)) {
    return NextResponse.json(
      { error: "Name must be one of the listed participants." },
      { status: 400 }
    );
  }
  if (!(media instanceof File) || media.size === 0) {
    return NextResponse.json(
      { error: "A photo or video entry is required." },
      { status: 400 }
    );
  }
  if (!(selfie instanceof File) || selfie.size === 0) {
    return NextResponse.json({ error: "A selfie is required." }, { status: 400 });
  }

  const mediaType = mediaTypeFor(media);
  if (!mediaType) {
    return NextResponse.json(
      { error: "Entry must be an image or a video." },
      { status: 400 }
    );
  }
  if (!selfie.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Selfie must be an image." },
      { status: 400 }
    );
  }
  if (media.size > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      { error: "Entry file is too large (max 20 MB)." },
      { status: 400 }
    );
  }
  if (selfie.size > MAX_SELFIE_BYTES) {
    return NextResponse.json(
      { error: "Selfie is too large (max 8 MB)." },
      { status: 400 }
    );
  }

  // Reserve the document id first so uploads land under a stable path.
  const ref = adminDb.collection(LEADERBOARD_COLLECTION).doc();

  const [mediaUrl, selfieUrl] = await Promise.all([
    uploadLeaderboardFile(media, ref.id, "media"),
    uploadLeaderboardFile(selfie, ref.id, "selfie"),
  ]);

  await ref.set({
    name,
    mediaUrl,
    mediaType,
    selfieUrl,
    score: null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
