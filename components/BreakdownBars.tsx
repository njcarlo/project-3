import { getRarityStyle } from "@/lib/rarity";

interface Breakdown {
  value: number;
}

export function BreakdownBars<T extends Breakdown>({
  rows,
  labelKey,
  colorByRarity = false,
}: {
  rows: T[];
  labelKey: keyof T;
  colorByRarity?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row) => {
        const label = String(row[labelKey]);
        const barClass = colorByRarity
          ? getRarityStyle(label).className.split(" ")[0]
          : "bg-accent";
        return (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate">
              {colorByRarity ? getRarityStyle(label).label : label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
              <div
                className={`h-2 rounded-full ${barClass}`}
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-muted">
              ¥{Math.round(row.value).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
