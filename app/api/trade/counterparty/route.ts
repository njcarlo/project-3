import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, verifyIdToken } from "@/lib/firebase/admin";
import type { UserProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  let authUser;
  try {
    authUser = await adminAuth.getUserByEmail(email);
  } catch {
    return NextResponse.json({ error: "No user with that email" }, { status: 404 });
  }

  if (authUser.uid === decoded.uid) {
    return NextResponse.json(
      { error: "That's your own account" },
      { status: 400 }
    );
  }

  const profileDoc = await adminDb.collection("users").doc(authUser.uid).get();
  const profile = profileDoc.exists ? (profileDoc.data() as UserProfile) : null;

  return NextResponse.json({
    uid: authUser.uid,
    displayName: profile?.displayName ?? authUser.email ?? "Collector",
  });
}
