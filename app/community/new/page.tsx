"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function NewPostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>{" "}
          to post.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "posts"), {
        authorUid: user!.uid,
        title: title.trim(),
        body: body.trim(),
        relatedCatalogItemIds: [],
        imageUrls: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      router.push(`/community/${ref.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">New post</h1>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 rounded-xl p-5">
        <input
          type="text"
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-card-border bg-background px-3 py-2"
        />
        <textarea
          required
          rows={6}
          placeholder="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded-lg border border-card-border bg-background px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
