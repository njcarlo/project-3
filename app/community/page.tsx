"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Post, UserProfile } from "@/lib/types";

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30)),
      async (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
        setPosts(items);

        const missing = [...new Set(items.map((p) => p.authorUid))].filter(
          (uid) => !(uid in authorNames)
        );
        if (missing.length === 0) return;

        const entries = await Promise.all(
          missing.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const profile = snap.data() as UserProfile | undefined;
            return [uid, profile?.displayName ?? "Collector"] as const;
          })
        );
        setAuthorNames((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        {user ? (
          <Link
            href="/community/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            New post
          </Link>
        ) : (
          <Link href="/login" className="text-sm text-accent underline">
            Sign in to post
          </Link>
        )}
      </div>

      {posts === null ? (
        <p className="text-muted">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="card rounded-xl p-8 text-center">
          <p className="text-muted">No posts yet — be the first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const name = authorNames[post.authorUid] ?? "Collector";
            return (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="card flex gap-3 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{post.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {post.body}
                  </p>
                  <p className="mt-2 text-xs text-muted">{name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
