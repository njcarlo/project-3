/**
 * One-off migration: relabels existing Firestore docs saved with
 * currency: "JPY" to "PHP" now that the app displays/collects pesos.
 * This only relabels the currency field — it does NOT convert amounts.
 *
 * Usage: npm run migrate-currency
 */
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "../lib/firebase/admin";

async function migrateQuery(
  query: Query,
  label: string
): Promise<number> {
  const snap = await query.where("currency", "==", "JPY").get();

  if (snap.empty) {
    console.log(`${label}: nothing to migrate.`);
    return 0;
  }

  // Firestore batches cap at 500 writes.
  let updated = 0;
  const docs: QueryDocumentSnapshot[] = snap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = adminDb.batch();
    for (const doc of docs.slice(i, i + 500)) {
      batch.update(doc.ref, { currency: "PHP" });
    }
    await batch.commit();
    updated += Math.min(500, docs.length - i);
  }

  console.log(`${label}: migrated ${updated} doc(s).`);
  return updated;
}

async function main() {
  // Sessions live under userCollections/{uid}/sessions — a collection group
  // query is needed to reach every user's subcollection at once. (Firestore
  // may prompt you to create a collection-group index the first time this
  // runs; the error includes a direct console link if so.)
  const sessionsCount = await migrateQuery(
    adminDb.collectionGroup("sessions"),
    "userCollections/*/sessions"
  );
  // priceSubmissions is a top-level collection, so a plain query is enough.
  const submissionsCount = await migrateQuery(
    adminDb.collection("priceSubmissions"),
    "priceSubmissions"
  );

  console.log(
    `Done. ${sessionsCount + submissionsCount} total doc(s) relabeled JPY -> PHP.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
