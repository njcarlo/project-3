"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PARTICIPANTS } from "@/lib/leaderboard";
import { SubmissionGuide } from "@/components/SubmissionGuide";

interface HistoryItem {
  id: string;
  score: number;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  at: number;
}

interface BoardEntry {
  name: string;
  score: number;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  history: HistoryItem[];
}

// Poll interval while the tab is visible. Kept relatively high (and paused
// entirely when the tab is hidden) to minimize Firestore reads / bandwidth so
// the app stays within the free tier.
const POLL_MS = 20000;

// The board shows the top 10; the top 5 are prize winners, each with its own
// color. Ranks 6–10 appear in a neutral style.
const PRIZE_STYLES = [
  { badge: "bg-yellow-400 text-yellow-950", ring: "ring-yellow-400/70" },
  { badge: "bg-slate-300 text-slate-800", ring: "ring-slate-300/70" },
  { badge: "bg-amber-600 text-amber-50", ring: "ring-amber-500/70" },
  { badge: "bg-sky-500 text-white", ring: "ring-sky-400/70" },
  { badge: "bg-fuchsia-500 text-white", ring: "ring-fuchsia-400/70" },
];
const BOARD_LIMIT = 10;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<BoardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      // Never fetch for a backgrounded tab — those reads are wasted.
      if (document.hidden) return;
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

    function startPolling() {
      if (timer) return;
      load();
      timer = setInterval(load, POLL_MS);
    }
    function stopPolling() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibility() {
      if (document.hidden) stopPolling();
      else startPolling();
    }

    // Only poll while the tab is in the foreground.
    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Look up scores by participant name for the sidebar and the detail view.
  const byName = new Map((entries ?? []).map((e) => [e.name, e]));
  const selectedEntry = selectedName ? byName.get(selectedName) ?? null : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
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
          <p className="mt-1 text-xs text-muted">
            Top 10 shown · 🏆 top 5 win prizes
          </p>
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
        {/* Participant list — click a name to see their score. On mobile it
            sits below the board and scrolls so it doesn't push the rankings
            off-screen. */}
        <aside className="order-2 md:order-1 md:w-64 md:shrink-0">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Participants
          </h2>
          <ul className="card max-h-72 divide-y divide-card-border overflow-y-auto rounded-xl md:max-h-none">
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

          <div className="mt-4">
            <SubmissionGuide />
          </div>
        </aside>

        {/* Ranked board — shown first on mobile. */}
        <div className="order-1 min-w-0 flex-1 md:order-2">
          {entries === null ? (
            <p className="text-muted">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="card rounded-xl p-8 text-center text-muted">
              No scored entries yet. Check back soon!
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {entries.slice(0, BOARD_LIMIT).map((entry, i) => {
                const prize = i < PRIZE_STYLES.length ? PRIZE_STYLES[i] : null;
                return (
                <li key={entry.name}>
                  <button
                    onClick={() => setSelectedName(entry.name)}
                    className={`card flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-card-border/30 sm:gap-4 sm:p-4 ${
                      prize ? `ring-2 ring-inset ${prize.ring}` : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        prize ? prize.badge : "bg-card-border text-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
                      {!entry.mediaUrl ? (
                        // Selfie-only entry — nothing public to show, so use a
                        // name initial.
                        <div className="flex h-full w-full items-center justify-center bg-card-border/40 text-lg font-bold text-muted">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      ) : entry.mediaType === "video" ? (
                        // Placeholder instead of a <video> so we don't download
                        // video bytes for every board row — the clip loads only
                        // when the entry is opened.
                        <div className="flex h-full w-full items-center justify-center bg-card-border/40 text-xl">
                          ▶
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.mediaUrl}
                          alt={entry.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{entry.name}</p>
                        {prize && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Prize
                          </span>
                        )}
                      </div>
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
                );
              })}
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
        {entry.mediaUrl && (
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
        )}

        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Score history
        </h3>
        <ul className="flex flex-col gap-2">
          {entry.history.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-lg border border-card-border bg-background px-3 py-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-card-border/40">
                {!h.mediaUrl ? (
                  <span className="text-xs text-muted">—</span>
                ) : h.mediaType === "video" ? (
                  <span className="text-sm">▶</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.mediaUrl}
                    alt=""
                    loading="lazy"
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
