"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MAX_MEDIA_BYTES,
  MAX_SELFIE_BYTES,
  MAX_QR_BYTES,
  PARTICIPANTS,
  isValidParticipant,
} from "@/lib/leaderboard";
import { compressImage } from "@/lib/imageCompression";
import { SubmissionGuide } from "@/components/SubmissionGuide";

export default function LeaderboardSubmitPage() {
  const [name, setName] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [qr, setQr] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please select your name.");
    if (!isValidParticipant(name.trim()))
      return setError("Please pick your name from the participant list.");
    if (!media && !selfie)
      return setError("Please add at least a photo/video entry or a selfie.");
    if (!qr) return setError("Please add a photo of your Trainer ID QR.");

    setBusy(true);
    try {
      // Shrink images before upload to keep Storage/bandwidth usage low.
      // Videos and undecodable files pass through unchanged.
      const [mediaOut, selfieOut, qrOut] = await Promise.all([
        media ? compressImage(media, { maxDim: 1920, quality: 0.82 }) : null,
        selfie ? compressImage(selfie, { maxDim: 1280, quality: 0.82 }) : null,
        // QR kept sharper so it stays scannable.
        compressImage(qr, { maxDim: 1600, quality: 0.9 }),
      ]);

      // Validate sizes against the (post-compression) files.
      if (mediaOut && mediaOut.size > MAX_MEDIA_BYTES)
        throw new Error("Your entry is too large (max 16 MB).");
      if (selfieOut && selfieOut.size > MAX_SELFIE_BYTES)
        throw new Error("Your selfie is too large (max 6 MB).");
      if (qrOut.size > MAX_QR_BYTES)
        throw new Error("Your Trainer ID QR is too large (max 6 MB).");

      const form = new FormData();
      form.append("name", name.trim());
      if (mediaOut) form.append("media", mediaOut);
      if (selfieOut) form.append("selfie", selfieOut);
      form.append("qr", qrOut);

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

  const query = nameQuery.trim().toLowerCase();
  const filteredNames =
    query === ""
      ? PARTICIPANTS
      : PARTICIPANTS.filter((p) => p.toLowerCase().includes(query));

  function selectName(p: string) {
    setName(p);
    setNameQuery(p);
    setNameOpen(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Submit your entry</h1>
      <p className="mb-8 text-sm text-muted">
        Find your name and upload a photo of your Trainer ID QR. Add a
        photo/video entry and/or a selfie (at least one) so we can verify
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <div className="relative">
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="Search your name..."
              value={nameQuery}
              onFocus={() => setNameOpen(true)}
              onChange={(e) => {
                setNameQuery(e.target.value);
                setName("");
                setNameOpen(true);
              }}
              onBlur={() => setTimeout(() => setNameOpen(false), 150)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
            {nameOpen && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-card-border bg-background shadow-lg">
                {filteredNames.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted">
                    No participant found.
                  </li>
                ) : (
                  filteredNames.map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        // Prevent the input's blur from firing before the click.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectName(p)}
                        className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-card-border/40 ${
                          name === p ? "bg-accent/20 font-medium" : ""
                        }`}
                      >
                        {p}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          {name ? (
            <span className="text-xs text-emerald-500">✓ Selected: {name}</span>
          ) : (
            <span className="text-xs text-muted">
              Tap the field and type to find your name in the list.
            </span>
          )}
        </div>

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
          <span className="text-sm font-medium">Trainer ID QR</span>
          <input
            type="file"
            required
            accept="image/*"
            onChange={(e) => setQr(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          <span className="text-xs text-muted">
            A photo or screenshot of your Trainer ID QR code, up to 6 MB.
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
