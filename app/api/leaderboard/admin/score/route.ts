import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { LEADERBOARD_COLLECTION } from "@/lib/leaderboard";
import { serializeSubmission } from "@/lib/leaderboardServer";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

// Set (or clear) a submission's score. Setting a numeric score marks it
// "scored" so it appears on the public leaderboard; passing null moves it back
// to "pending" (e.g. to pull an entry from the board).
export async function POST(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const rawScore = body.score;

  if (!id) {
    return NextResponse.json({ error: "Missing submission id." }, { status: 400 });
  }

  let score: number | null;
  if (rawScore === null) {
    score = null;
  } else if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    score = rawScore;
  } else {
    return NextResponse.json(
      { error: "Score must be a number or null." },
      { status: 400 }
    );
  }

  const ref = adminDb.collection(LEADERBOARD_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  await ref.update({
    score,
    status: score === null ? "pending" : "scored",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return NextResponse.json({ submission: serializeSubmission(updated) });
}
