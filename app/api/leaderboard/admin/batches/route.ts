import { NextRequest, NextResponse } from "next/server";
import { setActiveBatch, setBatchOpen } from "@/lib/leaderboardConfig";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";

// Admin: create/activate a batch, or open/close an existing one.
// - { name } -> create (if new) and activate.
// - { name, open: boolean } -> set the batch's open/closed status.
export async function POST(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
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

  const config =
    typeof body.open === "boolean"
      ? await setBatchOpen(name, body.open)
      : await setActiveBatch(name);
  return NextResponse.json(config);
}
