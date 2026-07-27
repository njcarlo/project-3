import { getRarityStyle } from "@/lib/rarity";

export function RarityBadge({ rarity }: { rarity: string }) {
  const { label, className } = getRarityStyle(rarity);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
