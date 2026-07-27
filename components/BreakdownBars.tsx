interface Breakdown {
  value: number;
}

export function BreakdownBars<T extends Breakdown>({
  rows,
  labelKey,
}: {
  rows: T[];
  labelKey: keyof T;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((row) => (
        <div
          key={String(row[labelKey])}
          className="flex items-center gap-2 text-sm"
        >
          <span className="w-28 shrink-0 capitalize">
            {String(row[labelKey])}
          </span>
          <div className="h-2 flex-1 rounded bg-black/5 dark:bg-white/10">
            <div
              className="h-2 rounded bg-black dark:bg-white"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-black/60 dark:text-white/60">
            ¥{Math.round(row.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
