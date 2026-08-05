"use client";

import { useState } from "react";
import Link from "next/link";

export default function LeaderboardSubmitPage() {
  const [name, setName] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your name.");
    if (!media) return setError("Please add a photo or video entry.");
    if (!selfie) return setError("Please add a selfie.");

    setBusy(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("media", media);
      form.append("selfie", selfie);

      const res = await fetch("/api/leaderboard/submit", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card rounded-xl p-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Entry submitted! 🎉
          </h1>
          <p className="mb-6 text-muted">
            Thanks, {name.trim()}. An admin will review your entry and set your
            score.
          </p>
          <Link
            href="/leaderboard"
            className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
          >
            View leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Submit your entry</h1>
      <p className="mb-8 text-sm text-muted">
        Enter your name, upload your photo or video, and add a selfie so we can
        verify it&apos;s really you.
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5 rounded-xl p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            required
            maxLength={80}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Photo or video entry</span>
          <input
            type="file"
            required
            accept="image/*,video/*"
            onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
            className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">Image or video, up to 50 MB.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Selfie</span>
          <input
            type="file"
            required
            accept="image/*"
            capture="user"
            onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
            className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">A photo of you, up to 10 MB.</span>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Submitting..." : "Submit entry"}
        </button>
      </form>
    </div>
  );
}
