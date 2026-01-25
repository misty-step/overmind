import Link from "next/link";

type Signal = "traction" | "healthy" | "degraded" | "dead" | "awaiting-data";

export interface ProductWithMetrics {
  _id: string;
  name: string;
  domain: string;
  description?: string;
  category?: string;
  stripeProductId?: string;
  signal: Signal;
  growth: number | null;
  latestMetrics: {
    visits: number;
    devices: number;
    bounceRate: number;
    healthy: boolean;
    responseTime?: number;
  } | null;
  stripeMetrics?: {
    mrr: number; // in cents
    subscribers: number;
  } | null;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ProductCard({ product }: { product: ProductWithMetrics }) {
  const metrics = product.latestMetrics;
  const stripeMetrics = product.stripeMetrics;
  const hasTraction = product.signal === "traction";
  const isDead = product.signal === "dead";
  const isAwaiting = product.signal === "awaiting-data";
  const hasRevenue = (stripeMetrics?.mrr ?? 0) > 0;

  return (
    <Link
      href={`/dashboard/products/${product._id}`}
      className={`card block p-5 transition-colors hover:border-border-glow hover:bg-bg-carapace ${
        hasTraction ? "border-border-glow bg-bg-carapace" : ""
      } ${isDead ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-text-light font-medium">
            {product.name}
          </h3>
          <button
            type="button"
            className="text-text-mid text-sm hover:text-hive bg-transparent p-0 border-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`https://${product.domain}`, "_blank", "noopener,noreferrer");
            }}
          >
            {product.domain}
          </button>
        </div>
        <HealthIndicator signal={product.signal} growth={product.growth} />
      </div>

      {/* Metrics */}
      {isDead ? (
        <div className="mt-4 text-text-dim text-sm font-medium">No activity</div>
      ) : !isAwaiting && (metrics || stripeMetrics) ? (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {stripeMetrics ? (
            <>
              <MetricValue
                label="MRR"
                value={formatCurrency(stripeMetrics.mrr)}
                highlight={hasRevenue}
              />
              <MetricValue
                label="Subscribers"
                value={stripeMetrics.subscribers.toLocaleString()}
              />
              {metrics && (
                <MetricValue
                  label="Visits"
                  value={metrics.visits.toLocaleString()}
                  highlight={hasTraction}
                />
              )}
            </>
          ) : metrics ? (
            <>
              <MetricValue
                label="Visits"
                value={metrics.visits.toLocaleString()}
                highlight={hasTraction}
              />
              <MetricValue
                label="Devices"
                value={metrics.devices.toLocaleString()}
              />
              <MetricValue
                label="Bounce"
                value={`${metrics.bounceRate}%`}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 text-text-mid text-sm">
            <svg
              className="w-4 h-4 motion-safe:animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v6h6M20 20v-6h-6M5.5 9A7 7 0 0 1 18 7.5M18.5 15A7 7 0 0 1 6 16.5"
              />
            </svg>
            <span className="font-medium">Awaiting data</span>
          </div>
          <div className="text-text-dim text-xs mt-1">Run a refresh to fetch health checks</div>
        </div>
      )}

      {/* Status badge */}
      {hasTraction && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-2 py-1 badge-traction text-xs font-medium">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Traction
        </div>
      )}
    </Link>
  );
}

function formatGrowth(growth: number | null): string | null {
  if (growth === null || Number.isNaN(growth)) return null;
  const rounded = Math.round(growth);
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${normalized}%`;
}

const SIGNAL_DISPLAY: Record<Signal, { statusClass: string; label: string; showGrowth: boolean }> = {
  traction: { statusClass: "status-signal", label: "🔥 Traction", showGrowth: true },
  healthy: { statusClass: "status-healthy", label: "✅ Healthy", showGrowth: false },
  degraded: { statusClass: "status-warning", label: "⚠️ Degraded", showGrowth: true },
  dead: { statusClass: "status-error", label: "💀 Dead", showGrowth: false },
  "awaiting-data": { statusClass: "status-awaiting", label: "🕐 Awaiting", showGrowth: false },
};

function HealthIndicator({
  signal,
  growth,
}: {
  signal: Signal;
  growth: number | null;
}) {
  const { statusClass, label, showGrowth } = SIGNAL_DISPLAY[signal];
  const growthLabel = showGrowth ? formatGrowth(growth) : null;
  const growthClass = signal === "traction" ? "text-hive" : "text-caution";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-1 text-xs font-semibold text-text-light ${
        signal === "awaiting-data" ? "motion-safe:animate-pulse" : ""
      }`}
      title={label}
    >
      <span className={`status-dot ${statusClass}`} />
      <span>{label}</span>
      {growthLabel ? (
        <span className={`text-[11px] font-semibold tabular-nums ${growthClass}`}>
          {growthLabel}
        </span>
      ) : null}
    </div>
  );
}

function MetricValue({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-text-dim text-xs tracking-wide mb-0.5">
        {label}
      </div>
      <div
        className={`font-medium tabular-nums text-text-light ${
          highlight ? "text-hive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
