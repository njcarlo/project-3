"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-card-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
    >
      {copied ? "Copied!" : "Copy share link"}
    </button>
  );
}
