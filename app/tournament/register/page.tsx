"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { MAX_QR_BYTES } from "@/lib/leaderboard";
import { isValidUsername } from "@/lib/leaderboardUsername";
import { compressImage } from "@/lib/imageCompression";

const FACEBOOK_URL = "https://www.facebook.com/JohnNavarro012121/";

// Shown right after registering: pay via the organizer's QR and upload a
// screenshot as proof, or just message the organizer instead — either
// works, this isn't required to submit an entry later.
function PaymentSection({ paymentQrUrl }: { paymentQrUrl: string | null }) {
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!proof || !auth.currentUser) return;
    setBusy(true);
    setError(null);
    try {
      const proofOut = await compressImage(proof, { maxDim: 1600, quality: 0.9 });
      const form = new FormData();
      form.append("proof", proofOut);

      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/leaderboard/register/payment-proof", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-card-border p-4 text-left">
      <p className="mb-3 text-sm font-semibold">Pay the tournament fee</p>

      {paymentQrUrl && (
        <div className="mb-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={paymentQrUrl}
            alt="Payment QR"
            className="h-48 w-48 rounded-lg border border-card-border bg-white object-contain p-2"
          />
          <p className="text-xs text-muted">Scan to pay, then upload proof below.</p>
        </div>
      )}

      {uploaded ? (
        <p className="text-sm text-emerald-500">
          ✓ Payment proof uploaded — the organizer will confirm it shortly.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!proof || busy}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Upload payment screenshot"}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Prefer to ask first, or don&apos;t see a QR above?
      </p>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block rounded-full bg-[#1877F2] px-4 py-1.5 text-sm font-medium text-white"
      >
        Message John on Facebook
      </a>
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [messenger, setMessenger] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [qr, setQr] = useState<File | null>(null);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
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
        if (!active) return;
        setActiveBatch(data.activeBatch ?? null);
        setPaymentQrUrl(data.paymentQrUrl ?? null);
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
    if (!isValidUsername(username))
      return setError(
        "Username must be 3-24 characters: letters, numbers, and underscores only."
      );
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
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
      form.append("username", username.trim());
      form.append("password", password);
      form.append("qr", qrOut);

      const res = await fetch("/api/leaderboard/register", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Registration failed.");

      // Sign straight into the new account so they can head to /leaderboard
      // /submit without re-entering their password.
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
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
            Thanks, {name.trim()}. You&apos;re signed in as{" "}
            <b className="text-foreground">{username.trim()}</b> — use that
            username and password to log back in any time.
          </p>

          <PaymentSection paymentQrUrl={paymentQrUrl} />

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/leaderboard/submit"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
            >
              Submit your entry
            </Link>
            <Link
              href="/tournament"
              className="rounded-full border border-card-border px-5 py-2 text-sm font-medium hover:bg-card-border/30"
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
      <p className="mb-2 text-sm text-muted">
        Sign up for {activeBatch ? <b>{activeBatch}</b> : "the tournament"}.
        Enter your name, a contact, a username + password for your own login,
        and a photo of your Trainer ID QR.
      </p>
      <p className="mb-8 text-sm text-muted">
        After registering, you&apos;ll get a QR to pay the tournament fee and
        upload proof — or you can just message{" "}
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent underline"
        >
          John on Facebook
        </a>{" "}
        instead.
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

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Username</span>
            <input
              type="text"
              required
              autoComplete="username"
              maxLength={24}
              placeholder="Pick a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-card-border bg-background px-3 py-2"
            />
            <span className="text-xs text-muted">
              3-24 characters: letters, numbers, underscores.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="Pick a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-card-border bg-background px-3 py-2"
            />
            <span className="text-xs text-muted">At least 6 characters.</span>
          </label>
        </div>
        <p className="-mt-3 text-xs text-muted">
          This logs you into the app itself — use it to submit your entry
          later at{" "}
          <Link href="/leaderboard/login" className="text-accent underline">
            /leaderboard/login
          </Link>
          .
        </p>

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
