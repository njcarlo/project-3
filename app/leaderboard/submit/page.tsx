"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  MAX_MEDIA_BYTES,
  MAX_SELFIE_BYTES,
  MAX_QR_BYTES,
  SUBMISSIONS_OPEN,
} from "@/lib/leaderboard";
import { compressImage } from "@/lib/imageCompression";
import { SubmissionGuide } from "@/components/SubmissionGuide";

export default function LeaderboardSubmitPage() {
  const { user, loading } = useAuth();

  if (!SUBMISSIONS_OPEN) return <Walkthrough />;

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:py-24">
        <div className="card rounded-xl p-6">
          <h1 className="mb-1 text-xl font-bold tracking-tight">
            Submit an entry
          </h1>
          <p className="mb-5 text-sm text-muted">
            Log in with your player account to submit.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/leaderboard/login"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
            >
              Log in
            </Link>
            <Link
              href="/tournament/register"
              className="rounded-full border border-card-border px-5 py-2 text-sm font-medium hover:bg-card-border/30"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <SubmitForm user={user} />;
}

// Explains how submitting will work once it opens, without exposing the
// actual upload form yet.
function Walkthrough() {
  const steps = [
    {
      title: "Register",
      body: "Sign up with your name, a contact, and your Trainer ID QR at /tournament/register. This also creates your own username + password login.",
    },
    {
      title: "Get your fee confirmed",
      body: "Message the organizer on Facebook to arrange payment. Once confirmed, you're cleared to submit.",
    },
    {
      title: "Log in and submit your run",
      body: "Log in with your player account, then upload a photo/video of your run and/or a selfie (at least one) so we can verify it's really you.",
    },
    {
      title: "Admin reviews and scores it",
      body: "An admin checks your entry and sets your score. Only your best score counts — you can resubmit anytime to beat it.",
    },
    {
      title: "Climb the board",
      body: "Scores rank live on the public leaderboard, updating instantly as the admin scores entries.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Submitting isn&apos;t open yet
      </h1>
      <p className="mb-8 text-sm text-muted">
        Here&apos;s how it&apos;ll work once entries open. You can register
        now to get your account ready.
      </p>

      <ol className="mb-6 flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card flex gap-4 rounded-xl p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {i + 1}
            </div>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <SubmissionGuide />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/tournament/register"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
        >
          Register now
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-full border border-card-border px-5 py-2.5 text-sm font-medium hover:bg-card-border/30"
        >
          View leaderboard
        </Link>
      </div>
    </div>
  );
}

function SubmitForm({ user }: { user: User }) {
  const [media, setMedia] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [qr, setQr] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!media && !selfie)
      return setError("Please add at least a photo/video entry or a selfie.");

    setBusy(true);
    try {
      // Shrink images before upload to keep Storage/bandwidth usage low.
      // Videos and undecodable files pass through unchanged.
      const [mediaOut, selfieOut, qrOut] = await Promise.all([
        media ? compressImage(media, { maxDim: 1920, quality: 0.82 }) : null,
        selfie ? compressImage(selfie, { maxDim: 1280, quality: 0.82 }) : null,
        // QR kept sharper so it stays scannable.
        qr ? compressImage(qr, { maxDim: 1600, quality: 0.9 }) : null,
      ]);

      // Validate sizes against the (post-compression) files.
      if (mediaOut && mediaOut.size > MAX_MEDIA_BYTES)
        throw new Error("Your entry is too large (max 16 MB).");
      if (selfieOut && selfieOut.size > MAX_SELFIE_BYTES)
        throw new Error("Your selfie is too large (max 6 MB).");
      if (qrOut && qrOut.size > MAX_QR_BYTES)
        throw new Error("Your Trainer ID QR is too large (max 6 MB).");

      const form = new FormData();
      if (mediaOut) form.append("media", mediaOut);
      if (selfieOut) form.append("selfie", selfieOut);
      if (qrOut) form.append("qr", qrOut);

      const token = await user.getIdToken();
      const res = await fetch("/api/leaderboard/submit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
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
            Thanks, {user.displayName}. An admin will review your entry and
            set your score.
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Submit your entry</h1>
      <p className="mb-8 text-sm text-muted">
        Signed in as <b className="text-foreground">{user.displayName}</b>. Add
        a photo/video entry and/or a selfie (at least one) so we can verify
        it&apos;s really you.
      </p>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Guideline on the left; form on the right (stacked on mobile). */}
        <aside className="order-2 md:order-1 md:w-72 md:shrink-0">
          <SubmissionGuide />
        </aside>

        <form
          onSubmit={handleSubmit}
          className="card order-1 flex flex-1 flex-col gap-5 rounded-xl p-5 md:order-2"
        >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Photo or video entry <span className="text-muted">(optional)</span>
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">Image or video, up to 16 MB.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Selfie <span className="text-muted">(optional)</span>
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">
            A photo of you, up to 6 MB. Provide this or a photo/video entry (at
            least one).
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Trainer ID QR <span className="text-muted">(optional)</span>
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setQr(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">
            Only if you didn&apos;t provide it at registration. Up to 6 MB.
          </span>
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent px-5 py-2.5 font-medium text-accent-foreground disabled:opacity-50 sm:w-auto sm:self-start"
        >
          {busy ? "Submitting..." : "Submit entry"}
        </button>
        </form>
      </div>
    </div>
  );
}
