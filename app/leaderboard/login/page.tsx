"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { usernameToEmail } from "@/lib/leaderboardUsername";

export default function LeaderboardLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        usernameToEmail(username),
        password
      );
      router.push("/leaderboard/submit");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4">
      <div className="card w-full rounded-2xl p-8">
        <h1 className="mb-1 text-xl font-semibold">Player log in</h1>
        <p className="mb-6 text-sm text-muted">
          Use the username and password you picked when you registered.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-3 py-2 font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted">
          Not registered yet?{" "}
          <Link href="/tournament/register" className="text-accent underline">
            Register for the tournament
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
