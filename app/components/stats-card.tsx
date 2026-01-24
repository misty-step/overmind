interface StatsCardProps {
  label: string;
  value: string;
  subtext?: string;
  status?: "healthy" | "warning" | "error" | "signal";
}

export function StatsCard({ label, value, subtext, status }: StatsCardProps) {
  const statusDotClass = {
    healthy: "status-healthy",
    warning: "status-warning",
    error: "status-error",
    signal: "status-signal",
  }[status ?? "healthy"];

  return (
    <div className="card p-5 flex flex-col gap-2">
      {/* Header with label and status dot */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-dim">{label}</span>
        {status && <div className={`status-dot ${statusDotClass}`} />}
      </div>

      {/* Large metric value */}
      <div className="text-3xl font-display font-semibold text-text-light tabular-nums tracking-tight">
        {value}
      </div>

      {/* Subtext */}
      {subtext && (
        <div className="text-sm text-text-dim">{subtext}</div>
      )}
    </div>
  );
}
