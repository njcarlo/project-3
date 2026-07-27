"use client";

import { useState } from "react";
import { getCryUrl } from "@/lib/pokeapi";

export function CryButton({ pokemonName }: { pokemonName: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function play() {
    setStatus("loading");
    try {
      const url = await getCryUrl(pokemonName);
      if (!url) {
        setStatus("error");
        return;
      }
      const audio = new Audio(url);
      await audio.play();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      onClick={play}
      disabled={status === "loading"}
      title={status === "error" ? "Cry not found" : "Play cry"}
      className="rounded-full border border-card-border px-2.5 py-1 text-sm hover:bg-card disabled:opacity-50"
    >
      {status === "loading" ? "…" : status === "error" ? "🔇" : "🔊"}
    </button>
  );
}
