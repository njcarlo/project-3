import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { computePortfolioValue, resolveShowcaseItems } from "@/lib/portfolio";
import type { UserProfile } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  const profileSnap = await adminDb.collection("users").doc(uid).get();
  if (!profileSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = profileSnap.data() as UserProfile;
  if (profile.portfolioPublic === false) {
    return NextResponse.json({ error: "Private" }, { status: 403 });
  }

  const [data, showcaseItems] = await Promise.all([
    computePortfolioValue(uid),
    resolveShowcaseItems(profile.showcaseItemIds ?? []),
  ]);

  return NextResponse.json({
    profile: {
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      bio: profile.bio,
    },
    ...data,
    showcaseItems,
  });
}
