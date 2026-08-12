"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TournamentSummary {
  batch: string;
  active: boolean;
  open: boolean;
  participants: number;
  top: { name: string; score: number }[];
  championSelfieUrl: string | null;
}

export default function TournamentLandingPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(
    null
  );
  const [activeBatch, setActiveBatch] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard/tournaments", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!active) return;
        setTournaments(data.tournaments ?? []);
        setActiveBatch(data.activeBatch ?? null);
      } catch {
        if (active) setTournaments([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-12">
      {/* Hero */}
      <section className="mb-10 text-center">
        <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Mezastar Tournament
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Compete on the live leaderboard
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Register, submit your run, and climb the ranks in real time. The top 5
          of each tournament win prizes.
          {activeBatch && (
            <>
              {" "}
              Now accepting entries for{" "}
              <b className="text-foreground">{activeBatch}</b>.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/tournament/register"
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-foreground"
          >
            Register
          </Link>
          <Link
            href="/leaderboard/submit"
            className="rounded-full border border-card-border px-6 py-2.5 font-medium hover:bg-card-border/30"
          >
            Submit entry
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-card-border px-6 py-2.5 font-medium hover:bg-card-border/30"
          >
            Leaderboard
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-10 grid gap-3 sm:grid-cols-3">
        {[
          {
            step: "1",
            title: "Register",
            body: "Sign up with your name, a contact, and your Trainer ID QR.",
          },
          {
            step: "2",
            title: "Submit your run",
            body: "Upload a photo/video and/or a selfie once your fee is confirmed.",
          },
          {
            step: "3",
            title: "Climb the board",
            body: "The admin sets scores; your best score ranks you live.",
          },
        ].map((s) => (
          <div key={s.step} className="card rounded-xl p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {s.step}
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      {/* Catalog of tournaments */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Tournaments
        </h2>
        {tournaments === null ? (
          <p className="text-muted">Loading...</p>
        ) : tournaments.length === 0 ? (
          <div className="card rounded-xl p-8 text-center text-muted">
            No tournaments yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Link
                key={t.batch}
                href={`/leaderboard?batch=${encodeURIComponent(t.batch)}`}
                className="card rounded-xl p-4 transition-colors hover:bg-card-border/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{t.batch}</h3>
                  <div className="flex items-center gap-1">
                    {t.active && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                        Active
                      </span>
                    )}
                    {!t.open && (
                      <span className="rounded-full bg-card-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {t.participants}{" "}
                  {t.participants === 1 ? "player" : "players"} scored
                </p>

                {t.top.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No scores yet</p>
                ) : (
                  <ol className="mt-3 flex flex-col gap-1.5">
                    {t.top.map((p, i) => (
                      <li key={p.name} className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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
                        </span>
                        {i === 0 && (
                          <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-background">
                            {t.championSelfieUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={t.championSelfieUrl}
                                alt={p.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs">
                                🏆
                              </span>
                            )}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {p.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {p.score}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
