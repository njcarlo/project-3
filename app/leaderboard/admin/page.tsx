"use client";

import { useEffect, useState } from "react";
import { ADMIN_PASSWORD_HEADER, type LeaderboardSubmission } from "@/lib/leaderboard";

const STORAGE_KEY = "leaderboard-admin-password";

export default function LeaderboardAdminPage() {
  const [password, setPassword] = useState<string | null>(null);

  // Restore a previously entered password for this browser session. Runs once
  // on mount to sync from sessionStorage (an external store).
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setPassword(saved);
  }, []);

  if (!password) {
    return <PasswordGate onUnlock={setPassword} />;
  }
  return <Dashboard password={password} onLock={() => setPassword(null)} />;
}

function PasswordGate({ onUnlock }: { onUnlock: (pw: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Validate against the server before granting access.
      const res = await fetch("/api/leaderboard/admin/submissions", {
        headers: { [ADMIN_PASSWORD_HEADER]: value },
      });
      if (res.status === 401) {
        setError("Incorrect password.");
        return;
      }
      if (!res.ok) throw new Error();
      sessionStorage.setItem(STORAGE_KEY, value);
      onUnlock(value);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="card rounded-xl p-6">
        <h1 className="mb-1 text-xl font-bold tracking-tight">Admin access</h1>
        <p className="mb-5 text-sm text-muted">
          Enter the password to manage the live leaderboard.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            placeholder="Password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy || !value}
            className="rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  password,
  onLock,
}: {
  password: string;
  onLock: () => void;
}) {
  const [submissions, setSubmissions] = useState<LeaderboardSubmission[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard/admin/submissions", {
          headers: { [ADMIN_PASSWORD_HEADER]: password },
          cache: "no-store",
        });
        if (!active) return;
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          onLock();
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!active) return;
        setSubmissions(data.submissions ?? []);
        setError(null);
      } catch {
        if (active) setError("Couldn't load submissions.");
      }
    })();
    return () => {
      active = false;
    };
  }, [password, onLock]);

  async function setScore(id: string, score: number | null) {
    const res = await fetch("/api/leaderboard/admin/score", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [ADMIN_PASSWORD_HEADER]: password,
      },
      body: JSON.stringify({ id, score }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = data.submission as LeaderboardSubmission;
      setSubmissions((prev) =>
        prev ? prev.map((s) => (s.id === id ? updated : s)) : prev
      );
    }
  }

  const pending = submissions?.filter((s) => s.status === "pending") ?? [];
  const scored = submissions?.filter((s) => s.status === "scored") ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Leaderboard admin
        </h1>
        <button
          onClick={() => {
            sessionStorage.removeItem(STORAGE_KEY);
            onLock();
          }}
          className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Lock
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {submissions === null ? (
        <p className="text-muted">Loading...</p>
      ) : submissions.length === 0 ? (
        <div className="card rounded-xl p-8 text-center text-muted">
          No submissions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <Section
            title={`Pending review (${pending.length})`}
            items={pending}
            onSetScore={setScore}
          />
          <Section
            title={`Scored (${scored.length})`}
            items={scored}
            onSetScore={setScore}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onSetScore,
}: {
  title: string;
  items: LeaderboardSubmission[];
  onSetScore: (id: string, score: number | null) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <SubmissionCard key={s.id} submission={s} onSetScore={onSetScore} />
          ))}
        </div>
      )}
    </section>
  );
}

function SubmissionCard({
  submission,
  onSetScore,
}: {
  submission: LeaderboardSubmission;
  onSetScore: (id: string, score: number | null) => void;
}) {
  const [value, setValue] = useState(
    submission.score !== null ? String(submission.score) : ""
  );

  function save() {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) return;
    onSetScore(submission.id, parsed);
  }

  return (
    <div className="card rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background">
          {submission.mediaType === "video" ? (
            <video
              src={submission.mediaUrl}
              className="h-full w-full object-cover"
              controls
              playsInline
            />
          ) : (
            <a href={submission.mediaUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.mediaUrl}
                alt={submission.name}
                className="h-full w-full object-cover"
              />
            </a>
          )}
        </div>

        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background">
          <a href={submission.selfieUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={submission.selfieUrl}
              alt={`${submission.name} selfie`}
              className="h-full w-full object-cover"
            />
          </a>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{submission.name}</p>
          <p className="text-xs text-muted">
            Entry: {submission.mediaType} · selfie attached
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Score"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
            />
            <button
              onClick={save}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground"
            >
              {submission.status === "scored" ? "Update score" : "Set score"}
            </button>
            {submission.status === "scored" && (
              <button
                onClick={() => onSetScore(submission.id, null)}
                className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Remove from board
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
