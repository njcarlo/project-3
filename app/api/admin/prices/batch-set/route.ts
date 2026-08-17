import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import type { CatalogItem, Rarity } from "@/lib/types";

const VALID_RARITIES: readonly string[] = [
  "white-2",
  "white-3",
  "white-4",
  "white-5",
  "black-6",
  "violet-6-legacy",
  "promo-yellow",
  "promo-silver",
  "promo-gold",
  "promo-red",
];

// Admin bulk tool: sets a baseline price for every approved catalog item of
// the given rarities at once (e.g. a floor price for common 2-4 star tags
// that don't get many individual community submissions). Implemented as one
// "admin baseline" price submission per item (deterministic id, so
// re-running this updates rather than duplicates) that flows through the
// normal aggregation pipeline like any other active submission — it nudges
// the average rather than overriding it outright.
export async function POST(req: NextRequest) {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded?.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rarities: unknown = body.rarities;
  const price = Number(body.price);

  if (
    !Array.isArray(rarities) ||
    rarities.length === 0 ||
    !rarities.every((r) => typeof r === "string" && VALID_RARITIES.includes(r))
  ) {
    return NextResponse.json(
      { error: "rarities must be a non-empty array of valid rarity values." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "price must be a positive number." },
      { status: 400 }
    );
  }

  const snap = await adminDb
    .collection("catalogItems")
    .where("status", "==", "approved")
    .where("rarity", "in", rarities as Rarity[])
    .get();

  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogItem);

  let updated = 0;
  for (let i = 0; i < items.length; i += 500) {
    const batch = adminDb.batch();
    for (const item of items.slice(i, i + 500)) {
      const ref = adminDb
        .collection("priceSubmissions")
        .doc(`admin-baseline-${item.id}`);
      batch.set(ref, {
        catalogItemId: item.id,
        submittedBy: decoded.uid,
        price,
        currency: "PHP",
        type: "estimated_value",
        sourceNote: "Admin baseline price",
        submittedAt: FieldValue.serverTimestamp(),
        flagged: false,
        status: "active",
      });
    }
    await batch.commit();
    updated += Math.min(500, items.length - i);
  }

  return NextResponse.json({ updated, rarities });
}
