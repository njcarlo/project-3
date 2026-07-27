import type { Rarity } from "@/lib/types";

interface RarityStyle {
  label: string;
  className: string;
}

const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  "white-2": {
    label: "White ★2",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  "white-3": {
    label: "White ★3",
    className: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  },
  "white-4": {
    label: "White ★4",
    className: "bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50",
  },
  "white-5": {
    label: "Star ★5",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
  "black-6": {
    label: "Superstar ★6",
    className: "bg-zinc-900 text-amber-300 dark:bg-black dark:text-amber-300",
  },
  "violet-6-legacy": {
    label: "Legacy ★6",
    className: "bg-violet-600 text-white dark:bg-violet-500",
  },
  "promo-yellow": {
    label: "Promo",
    className: "bg-yellow-400 text-yellow-950",
  },
  "promo-silver": {
    label: "Promo",
    className: "bg-slate-300 text-slate-900",
  },
  "promo-gold": {
    label: "Promo",
    className: "bg-amber-400 text-amber-950",
  },
  "promo-red": {
    label: "Promo",
    className: "bg-red-500 text-white",
  },
};

export const RARITY_OPTIONS = Object.keys(RARITY_STYLES) as Rarity[];

export function getRarityStyle(rarity: string): RarityStyle {
  return (
    RARITY_STYLES[rarity as Rarity] ?? {
      label: rarity,
      className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    }
  );
}
