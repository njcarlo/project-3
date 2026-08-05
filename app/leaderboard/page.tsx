"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PublicEntry {
  id: string;
  name: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  score: number;
}

const POLL_MS = 5000;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<PublicEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
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

      {entries === null ? (
        <p className="text-muted">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="card rounded-xl p-8 text-center text-muted">
          No scored entries yet. Check back soon!
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="card flex items-center gap-4 rounded-xl p-4"
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
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{entry.score}</p>
                <p className="text-xs text-muted">points</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
