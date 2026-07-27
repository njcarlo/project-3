export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex-1 rounded-xl p-5">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
