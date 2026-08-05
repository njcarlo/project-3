"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PARTICIPANTS } from "@/lib/leaderboard";

interface HistoryItem {
  id: string;
  score: number;
  mediaUrl: string;
  mediaType: "image" | "video";
  at: number;
}

interface BoardEntry {
  name: string;
  score: number;
  mediaUrl: string;
  mediaType: "image" | "video";
  history: HistoryItem[];
}

const POLL_MS = 5000;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<BoardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load leaderboard.");
        const data = await res.json();
        if (active) {
          setEntries(data.entries ?? []);
          setError(null);
        }
      } catch {
        if (active) setError("Couldn't refresh the leaderboard.");
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Look up scores by participant name for the sidebar and the detail view.
  const byName = new Map((entries ?? []).map((e) => [e.name, e]));
  const selectedEntry = selectedName ? byName.get(selectedName) ?? null : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-500">
              Live
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Leaderboard</h1>
        </div>
        <Link
          href="/leaderboard/submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
        >
          Submit entry
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-muted">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Participant list — click a name to see their score. */}
        <aside className="md:w-64 md:shrink-0">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Participants
          </h2>
          <ul className="card divide-y divide-card-border overflow-hidden rounded-xl">
            {PARTICIPANTS.map((name) => {
              const entry = byName.get(name);
              return (
                <li key={name}>
                  <button
                    onClick={() => setSelectedName(name)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-card-border/30"
                  >
                    <span className="truncate">{name}</span>
                    {entry ? (
                      <span className="shrink-0 font-bold tabular-nums">
                        {entry.score}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted">—</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Ranked board. */}
        <div className="min-w-0 flex-1">
          {entries === null ? (
            <p className="text-muted">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="card rounded-xl p-8 text-center text-muted">
              No scored entries yet. Check back soon!
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {entries.map((entry, i) => (
                <li key={entry.name}>
                  <button
                    onClick={() => setSelectedName(entry.name)}
                    className="card flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-card-border/30"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        i === 0
                          ? "bg-yellow-400 text-yellow-950"
                          : i === 1
                            ? "bg-slate-300 text-slate-800"
                            : i === 2
                              ? "bg-amber-600 text-amber-50"
                              : "bg-card-border text-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>

                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background">
                      {entry.mediaType === "video" ? (
                        <video
                          src={entry.mediaUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.mediaUrl}
                          alt={entry.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{entry.name}</p>
                      <p className="text-xs text-muted">
                        {entry.history.length}{" "}
                        {entry.history.length === 1 ? "entry" : "entries"} · tap
                        to view
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums">
                        {entry.score}
                      </p>
                      <p className="text-xs text-muted">best</p>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {selectedName && (
        <EntryModal
          name={selectedName}
          entry={selectedEntry}
          onClose={() => setSelectedName(null)}
        />
      )}
    </div>
  );
}

function EntryModal({
  name,
  entry,
  onClose,
}: {
  name: string;
  entry: BoardEntry | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{name}</h2>
            <p className="text-sm text-muted">
              {entry ? `Best score: ${entry.score}` : "Not scored yet"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-card-border px-3 py-1 text-sm text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        {!entry ? (
          <p className="rounded-xl bg-background px-4 py-8 text-center text-sm text-muted">
            No scored entries yet for {name}. Check back once the admin has set a
            score.
          </p>
        ) : (
          <>
        <div className="mb-4 overflow-hidden rounded-xl bg-background">
          {entry.mediaType === "video" ? (
            <video
              src={entry.mediaUrl}
              className="max-h-[50vh] w-full object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.mediaUrl}
              alt={entry.name}
              className="max-h-[50vh] w-full object-contain"
            />
          )}
        </div>

        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Score history
        </h3>
        <ul className="flex flex-col gap-2">
          {entry.history.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-lg border border-card-border bg-background px-3 py-2"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-card-border/40">
                {h.mediaType === "video" ? (
                  <video
                    src={h.mediaUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.mediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {new Date(h.at).toLocaleString()}
                </p>
              </div>
              <span
                className={`text-lg font-bold tabular-nums ${
                  h.score === entry.score ? "text-emerald-500" : ""
                }`}
              >
                {h.score}
              </span>
            </li>
          ))}
        </ul>
          </>
        )}
      </div>
    </div>
  );
}
