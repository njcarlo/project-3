"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import type { UserProfile } from "@/lib/types";

export function PortfolioShareControls() {
  const { user } = useAuth();
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const profile = snap.data() as UserProfile | undefined;
      setIsPublic(profile?.portfolioPublic !== false);
    });
  }, [user]);

  if (!user) return null;

  async function toggle() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      portfolioPublic: !isPublic,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-card-border p-3 text-sm">
      <span className="text-muted">
        Your portfolio is{" "}
        <span className="font-medium text-foreground">
          {isPublic ? "public" : "private"}
        </span>
      </span>
      <button
        type="button"
        onClick={toggle}
        className="rounded-full border border-card-border px-3 py-1.5 text-muted hover:text-foreground"
      >
        Make {isPublic ? "private" : "public"}
      </button>
      {isPublic && <CopyLinkButton path={`/u/${user.uid}`} />}
    </div>
  );
}
