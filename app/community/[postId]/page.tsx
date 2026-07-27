"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Comment, Post, UserProfile } from "@/lib/types";

async function getDisplayName(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data() as UserProfile | undefined)?.displayName ?? "Collector";
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [authorName, setAuthorName] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentNames, setCommentNames] = useState<Record<string, string>>({});
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, "posts", postId),
      async (snap) => {
        if (!snap.exists()) {
          setPost(null);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Post;
        setPost(data);
        setAuthorName(await getDisplayName(data.authorUid));
      },
      () => setPost(null)
    );
  }, [postId]);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "posts", postId, "comments"),
        orderBy("createdAt", "asc")
      ),
      async (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
        setComments(items);

        const missing = [...new Set(items.map((c) => c.authorUid))];
        const entries = await Promise.all(
          missing.map(async (uid) => [uid, await getDisplayName(uid)] as const)
        );
        setCommentNames(Object.fromEntries(entries));
      }
    );
  }, [postId]);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !commentBody.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        authorUid: user.uid,
        body: commentBody.trim(),
        createdAt: serverTimestamp(),
      });
      setCommentBody("");
    } finally {
      setBusy(false);
    }
  }

  if (post === undefined) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-muted">Loading...</div>;
  }

  if (post === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted">
        Post not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/community" className="text-sm text-accent underline">
        ← Community
      </Link>

      <div className="card mt-4 rounded-xl p-5">
        <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs text-muted">{authorName}</p>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{post.body}</p>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">
        {comments.length} comment{comments.length === 1 ? "" : "s"}
      </h2>

      <div className="flex flex-col gap-3">
        {comments.map((c) => {
          const name = commentNames[c.authorUid] ?? "Collector";
          return (
            <div key={c.id} className="card flex gap-2 rounded-xl p-3 text-sm">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{name}</p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {user ? (
        <form onSubmit={handleComment} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Add a comment"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            Reply
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
    </div>
  );
}
