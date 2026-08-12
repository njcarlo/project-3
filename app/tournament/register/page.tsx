"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MAX_QR_BYTES } from "@/lib/leaderboard";
import { compressImage } from "@/lib/imageCompression";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [messenger, setMessenger] = useState("");
  const [qr, setQr] = useState<File | null>(null);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard/batches", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setActiveBatch(data.activeBatch ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!contact.trim())
      return setError("Please enter an email or phone number.");
    if (!qr) return setError("Please add a photo of your Trainer ID QR.");

    setBusy(true);
    try {
      const qrOut = await compressImage(qr, { maxDim: 1600, quality: 0.9 });
      if (qrOut.size > MAX_QR_BYTES)
        throw new Error("Your Trainer ID QR is too large (max 6 MB).");

      const form = new FormData();
      form.append("name", name.trim());
      form.append("contact", contact.trim());
      form.append("messenger", messenger.trim());
      form.append("qr", qrOut);

      const res = await fetch("/api/leaderboard/register", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Registration failed.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card rounded-xl p-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            You&apos;re registered! 🎉
          </h1>
          <p className="mb-6 text-muted">
            Thanks, {name.trim()}. Once the organizer confirms your tournament
            fee, they&apos;ll share the link for submitting your entry.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/tournament"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
            >
              Back to tournament
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Register</h1>
      <p className="mb-8 text-sm text-muted">
        Sign up for {activeBatch ? <b>{activeBatch}</b> : "the tournament"}.
        Enter your name, a contact, and a photo of your Trainer ID QR.
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5 rounded-xl p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            required
            maxLength={60}
            placeholder="Your name (as shown on the leaderboard)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email or phone</span>
          <input
            type="text"
            required
            maxLength={120}
            placeholder="So the organizer can reach you"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          <span className="text-xs text-muted">
            Kept private — only the organizer sees this.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Messenger <span className="text-muted">(optional)</span>
          </span>
          <input
            type="text"
            maxLength={200}
            placeholder="Messenger name or profile link"
            value={messenger}
            onChange={(e) => setMessenger(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          <span className="text-xs text-muted">
            Optional — helps the organizer reach you on Messenger.
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
          {busy ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
