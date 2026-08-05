import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

// Permanently remove a submission: deletes the Firestore doc and its uploaded
// media/selfie files from Storage.
export async function POST(req: NextRequest) {
  if (!requestHasAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing submission id." }, { status: 400 });
  }

  const ref = adminDb.collection(LEADERBOARD_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  // Remove the doc first, then best-effort clean up the uploaded files.
  await ref.delete();
  try {
    await adminStorage
      .bucket()
      .deleteFiles({ prefix: `leaderboard/${id}/` });
  } catch {
    // Files may already be gone; the submission is deleted regardless.
  }

  return NextResponse.json({ ok: true });
}
