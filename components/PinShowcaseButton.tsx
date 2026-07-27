"use client";

import { useEffect, useState } from "react";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserProfile } from "@/lib/types";

export function PinShowcaseButton({ catalogItemId }: { catalogItemId: string }) {
  const { user } = useAuth();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const profile = snap.data() as UserProfile | undefined;
      setPinned(profile?.showcaseItemIds?.includes(catalogItemId) ?? false);
    });
  }, [user, catalogItemId]);

  if (!user) return null;

  async function toggle() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      showcaseItemIds: pinned
        ? arrayRemove(catalogItemId)
        : arrayUnion(catalogItemId),
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={pinned ? "Remove from public showcase" : "Pin to public showcase"}
      className={`text-xs hover:underline ${pinned ? "text-accent" : "text-muted hover:text-foreground"}`}
    >
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}
