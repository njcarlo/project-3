import * as functions from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Creates a users/{uid} profile doc the moment someone signs up.
export const provisionUserProfile = functions.auth
  .user()
  .onCreate(async (user) => {
    const db = getFirestore();

    await db
      .collection("users")
      .doc(user.uid)
      .set({
        uid: user.uid,
        displayName: user.displayName ?? user.email?.split("@")[0] ?? "Collector",
        photoURL: user.photoURL ?? null,
        bio: "",
        role: "user",
        showcaseItemIds: [],
        stats: { totalItems: 0, totalValue: 0 },
        portfolioPublic: true,
        contributor: false,
        createdAt: FieldValue.serverTimestamp(),
      });
  });
