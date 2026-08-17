import { NextRequest, NextResponse } from "next/server";
import { MAX_QR_BYTES } from "@/lib/leaderboard";
import { requestHasAdminAccess } from "@/lib/leaderboardAuth";
import { setPaymentQrUrl } from "@/lib/leaderboardConfig";
import { uploadLeaderboardFile } from "@/lib/leaderboardStorage";

// Admin: upload/replace the payment QR shown to registrants on the
// registration confirmation screen. Pass { clear: true } instead of a file
// to remove it.
export async function POST(req: NextRequest) {
  if (!(await requestHasAdminAccess(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  if (form.get("clear") === "true") {
    const config = await setPaymentQrUrl(null);
    return NextResponse.json({ paymentQrUrl: config.paymentQrUrl });
  }

  const qr = form.get("qr");
  if (!(qr instanceof File) || qr.size === 0) {
    return NextResponse.json({ error: "Missing QR image." }, { status: 400 });
  }
  if (!qr.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Payment QR must be an image." },
      { status: 400 }
    );
  }
  if (qr.size > MAX_QR_BYTES) {
    return NextResponse.json(
      { error: "Payment QR is too large (max 6 MB)." },
      { status: 400 }
    );
  }

  // Fixed path (not per-submission) so re-uploading replaces the same file.
  const url = await uploadLeaderboardFile(qr, "payment-qr", "qr");
  const config = await setPaymentQrUrl(url);
  return NextResponse.json({ paymentQrUrl: config.paymentQrUrl });
}
