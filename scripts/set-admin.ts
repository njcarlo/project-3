/**
 * Grants (or revokes) the admin custom claim + Firestore role for a user.
 * Usage: npm run set-admin -- someone@example.com [--revoke]
 */
import { adminAuth, adminDb } from "../lib/firebase/admin";

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: npm run set-admin -- someone@example.com [--revoke]");
    process.exit(1);
  }

  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.setCustomUserClaims(user.uid, { admin: !revoke });
  await adminDb
    .collection("users")
    .doc(user.uid)
    .set({ role: revoke ? "user" : "admin" }, { merge: true });

  console.log(
    `${revoke ? "Revoked" : "Granted"} admin for ${email} (${user.uid}).`
  );
  console.log("They'll need to sign out and back in for the claim to take effect.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
