"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  DEFAULT_BATCH,
  PARTICIPANTS,
  type LeaderboardSubmission,
  type Registration,
} from "@/lib/leaderboard";

export default function TournamentAdminPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:py-24">
        <div className="card rounded-xl p-6">
          <h1 className="mb-1 text-xl font-bold tracking-tight">
            Admin access
          </h1>
          <p className="mb-5 text-sm text-muted">
            Sign in with the organizer account to manage the tournament.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-accent px-5 py-2 font-medium text-accent-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return <Dashboard user={user} onLock={() => signOut()} />;
}

async function authedFetch(
  user: User,
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

function Dashboard({ user, onLock }: { user: User; onLock: () => void }) {
  const [submissions, setSubmissions] = useState<LeaderboardSubmission[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [batches, setBatches] = useState<string[]>([]);
  const [activeBatch, setActiveBatch] = useState<string>("");
  const [viewBatch, setViewBatch] = useState<string>("");
  const [newBatch, setNewBatch] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [closedBatches, setClosedBatches] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<Registration[] | null>(
    null
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authedFetch(
          user,
          "/api/leaderboard/admin/registrations",
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active) setRegistrations(data.registrations ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  async function togglePaid(id: string, paid: boolean) {
    const res = await authedFetch(user, "/api/leaderboard/admin/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, paid }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = data.registration as Registration;
      setRegistrations((prev) =>
        prev ? prev.map((r) => (r.id === id ? updated : r)) : prev
      );
    }
  }

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
        setBatches(data.batches ?? []);
        setActiveBatch(data.activeBatch ?? "");
        setClosedBatches(data.closedBatches ?? []);
        setViewBatch((prev) => prev || data.activeBatch || "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggleBatchOpen(name: string, open: boolean) {
    const res = await authedFetch(user, "/api/leaderboard/admin/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, open }),
    });
    if (res.ok) {
      const data = await res.json();
      setClosedBatches(data.closedBatches ?? []);
    }
  }

  async function startNewBatch() {
    const name = newBatch.trim();
    if (!name) return;
    setBatchBusy(true);
    try {
      const res = await authedFetch(user, "/api/leaderboard/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches ?? []);
        setActiveBatch(data.activeBatch ?? name);
        setClosedBatches(data.closedBatches ?? []);
        setViewBatch(data.activeBatch ?? name);
        setNewBatch("");
      }
    } finally {
      setBatchBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authedFetch(
          user,
          "/api/leaderboard/admin/submissions",
          { cache: "no-store" }
        );
        if (!active) return;
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
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
  }, [user]);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:py-24">
        <div className="card rounded-xl p-6">
          <h1 className="mb-1 text-xl font-bold tracking-tight">
            Not authorized
          </h1>
          <p className="mb-5 text-sm text-muted">
            {user.email} doesn&apos;t have access to the tournament admin
            dashboard.
          </p>
          <button
            onClick={onLock}
            className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  async function setScore(id: string, score: number | null) {
    const res = await authedFetch(user, "/api/leaderboard/admin/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
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

  async function deleteSubmission(id: string) {
    const res = await authedFetch(user, "/api/leaderboard/admin/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSubmissions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    }
  }

  const term = search.trim().toLowerCase();
  const visible =
    submissions?.filter(
      (s) =>
        (!viewBatch || (s.batch || DEFAULT_BATCH) === viewBatch) &&
        (term === "" || s.name.toLowerCase().includes(term))
    ) ?? [];
  const pending = visible.filter((s) => s.status === "pending");
  // Scored entries mirror the public board: ranked high-to-low by score.
  const scored = visible
    .filter((s) => s.status === "scored")
    .slice()
    .sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name)
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tournament admin
        </h1>
        <button
          onClick={onLock}
          className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* Tournament batch controls. */}
      <div className="card mb-6 flex flex-col gap-3 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="admin-batch"
            className="text-xs font-medium uppercase tracking-wide text-muted"
          >
            Viewing tournament
          </label>
          <select
            id="admin-batch"
            value={viewBatch}
            onChange={(e) => setViewBatch(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
          >
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
                {b === activeBatch ? " (active)" : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            New entries join <b className="text-foreground">{activeBatch}</b>.
          </span>
        </div>

        {/* Open/closed toggle for the viewed tournament. */}
        {viewBatch && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Status
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                closedBatches.includes(viewBatch)
                  ? "bg-card-border text-muted"
                  : "bg-emerald-500/15 text-emerald-500"
              }`}
            >
              {closedBatches.includes(viewBatch) ? "Closed" : "Open"}
            </span>
            <button
              onClick={() =>
                toggleBatchOpen(viewBatch, closedBatches.includes(viewBatch))
              }
              className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
            >
              {closedBatches.includes(viewBatch)
                ? "Reopen tournament"
                : "Close tournament"}
            </button>
            <span className="text-xs text-muted">
              Closed = no new registrations or entries.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newBatch}
            maxLength={60}
            placeholder="New tournament name..."
            onChange={(e) => setNewBatch(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
          />
          <button
            onClick={startNewBatch}
            disabled={batchBusy || !newBatch.trim()}
            className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {batchBusy ? "Starting..." : "Start new tournament"}
          </button>
        </div>
        <p className="text-xs text-muted">
          Starting a new tournament makes it the active batch — new submissions
          go into it, and it gets its own leaderboard.
        </p>
      </div>

      {/* Registrations for the selected batch, with fee confirmation. */}
      <RegistrationsPanel
        registrations={(registrations ?? []).filter(
          (r) => (r.batch || DEFAULT_BATCH) === viewBatch
        )}
        loading={registrations === null}
        batch={viewBatch}
        onTogglePaid={togglePaid}
      />

      {submissions === null ? (
        <p className="text-muted">Loading...</p>
      ) : submissions.length === 0 ? (
        <div className="card rounded-xl p-8 text-center text-muted">
          No submissions yet.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <input
              type="search"
              list="admin-participant-list"
              autoComplete="off"
              placeholder="Search participants by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            />
            <datalist id="admin-participant-list">
              {PARTICIPANTS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {visible.length === 0 ? (
            <div className="card rounded-xl p-8 text-center text-muted">
              {search.trim()
                ? `No participants match "${search.trim()}" in ${viewBatch}.`
                : `No submissions in ${viewBatch} yet.`}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <Section
                title={`Pending review (${pending.length})`}
                items={pending}
                onSetScore={setScore}
                onDelete={deleteSubmission}
              />
              <Section
                title={`Leaderboard — scored (${scored.length})`}
                items={scored}
                onSetScore={setScore}
                onDelete={deleteSubmission}
                ranked
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onSetScore,
  onDelete,
  ranked = false,
}: {
  title: string;
  items: LeaderboardSubmission[];
  onSetScore: (id: string, score: number | null) => void;
  onDelete: (id: string) => void;
  ranked?: boolean;
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
          {items.map((s, i) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              onSetScore={onSetScore}
              onDelete={onDelete}
              rank={ranked ? i + 1 : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SubmissionCard({
  submission,
  onSetScore,
  onDelete,
  rank,
}: {
  submission: LeaderboardSubmission;
  onSetScore: (id: string, score: number | null) => void;
  onDelete: (id: string) => void;
  rank: number | null;
}) {
  const [value, setValue] = useState(
    submission.score !== null ? String(submission.score) : ""
  );

  function save() {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) return;
    onSetScore(submission.id, parsed);
  }

  function remove() {
    if (
      confirm(`Delete ${submission.name}'s entry? This can't be undone.`)
    ) {
      onDelete(submission.id);
    }
  }

  return (
    <div className="card rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-4">
        {rank !== null && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full text-lg font-bold ${
              rank === 1
                ? "bg-yellow-400 text-yellow-950"
                : rank === 2
                  ? "bg-slate-300 text-slate-800"
                  : rank === 3
                    ? "bg-amber-600 text-amber-50"
                    : "bg-card-border text-foreground"
            }`}
          >
            {rank}
          </div>
        )}
        {submission.mediaUrl && (
          <div className="flex flex-col items-center gap-1">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background">
              {submission.mediaType === "video" ? (
                <video
                  src={submission.mediaUrl}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="none"
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
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Entry
            </span>
          </div>
        )}

        {submission.selfieUrl && (
          <div className="flex flex-col items-center gap-1">
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
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Selfie
            </span>
          </div>
        )}

        {submission.qrUrl && (
          <div className="flex flex-col items-center gap-1">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background">
              <a href={submission.qrUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={submission.qrUrl}
                  alt={`${submission.name} Trainer ID QR`}
                  className="h-full w-full object-contain"
                />
              </a>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Trainer QR
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{submission.name}</p>
          <p className="text-xs text-muted">
            {[
              submission.mediaUrl ? `entry (${submission.mediaType})` : null,
              submission.selfieUrl ? "selfie" : null,
              submission.qrUrl ? "Trainer QR" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
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
            <button
              onClick={remove}
              className="rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Best-effort mailto:/tel: link for a free-typed contact field.
function contactHref(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.includes("@")) return `mailto:${trimmed}`;
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.length >= 7) return `tel:${digits}`;
  return "#";
}

// Messenger field may already be a profile URL, or just a name/handle.
function messengerHref(messenger: string): string | null {
  const trimmed = messenger.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://m.me/${encodeURIComponent(trimmed.replace(/^@/, ""))}`;
}

function ContactLink({ contact }: { contact: string }) {
  const href = contactHref(contact);
  if (href === "#") {
    return <p className="truncate text-xs text-muted">{contact}</p>;
  }
  return (
    <a
      href={href}
      className="truncate text-xs text-muted hover:text-foreground hover:underline"
    >
      {contact}
    </a>
  );
}

function MessengerLink({ messenger }: { messenger: string }) {
  const href = messengerHref(messenger);
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate text-xs text-muted hover:text-foreground hover:underline"
    >
      💬 {messenger}
    </a>
  );
}

function RegistrationsPanel({
  registrations,
  loading,
  batch,
  onTogglePaid,
}: {
  registrations: Registration[];
  loading: boolean;
  batch: string;
  onTogglePaid: (id: string, paid: boolean) => void;
}) {
  const paidCount = registrations.filter((r) => r.paid).length;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Registrations — {batch} ({paidCount}/{registrations.length} paid)
      </h2>
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : registrations.length === 0 ? (
        <p className="text-sm text-muted">No registrations in {batch} yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {registrations.map((r) => (
            <div
              key={r.id}
              className="card flex flex-wrap items-center gap-3 rounded-xl p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                {r.qrUrl && (
                  <a href={r.qrUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.qrUrl}
                      alt={`${r.name} Trainer ID QR`}
                      className="h-full w-full object-contain"
                    />
                  </a>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.name}</p>
                <ContactLink contact={r.contact} />
                {r.messenger && <MessengerLink messenger={r.messenger} />}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  r.paid
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-card-border text-muted"
                }`}
              >
                {r.paid ? "Paid" : "Unpaid"}
              </span>
              {!r.paid && (
                <a
                  href={messengerHref(r.messenger) ?? contactHref(r.contact)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
                >
                  Message to pay
                </a>
              )}
              <button
                onClick={() => onTogglePaid(r.id, !r.paid)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  r.paid
                    ? "border border-card-border text-muted hover:text-foreground"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {r.paid ? "Mark unpaid" : "Confirm payment"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
