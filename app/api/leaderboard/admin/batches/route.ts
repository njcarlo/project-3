import { NextRequest, NextResponse } from "next/server";
import { setActiveBatch } from "@/lib/leaderboardConfig";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

// Admin: create and/or activate a tournament batch. New submissions join the
// active batch.
export async function POST(req: NextRequest) {
  if (!requestHasAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Batch name is required." }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: "Batch name is too long." }, { status: 400 });
  }

  const config = await setActiveBatch(name);
  return NextResponse.json(config);
}
