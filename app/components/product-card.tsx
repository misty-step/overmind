import Link from "next/link";

type ProductStatus = "healthy" | "warning" | "error" | "signal";

export interface ProductWithMetrics {
  _id: string;
  name: string;
  domain: string;
  description?: string;
  category?: string;
  stripeProductId?: string;
  latestMetrics: {
    visits: number;
    devices: number;
    bounceRate: number;
    status: ProductStatus;
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
  const hasTraffic = (metrics?.visits ?? 0) > 0;
  const hasTraction = (metrics?.visits ?? 0) > 100;
  const hasRevenue = (stripeMetrics?.mrr ?? 0) > 0;

  return (
    <Link
      href={`/dashboard/products/${product._id}`}
      className={`card block p-5 transition-colors hover:border-border-glow hover:bg-bg-carapace ${
        hasTraction ? "border-border-glow bg-bg-carapace" : ""
      }`}
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
        <HealthIndicator status={metrics?.status ?? null} />
      </div>

      {/* Metrics */}
      {metrics || stripeMetrics ? (
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
            </>
          ) : null}
          {metrics ? (
            <>
              <MetricValue
                label="Visits"
                value={metrics.visits.toLocaleString()}
                highlight={hasTraction}
              />
              {!stripeMetrics && (
                <>
                  <MetricValue
                    label="Devices"
                    value={metrics.devices.toLocaleString()}
                  />
                  <MetricValue
                    label="Bounce"
                    value={`${metrics.bounceRate}%`}
                  />
                </>
              )}
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

function HealthIndicator({ status }: { status: ProductStatus | null }) {
  const statusClass =
    status === "healthy"
      ? "status-healthy"
      : status === "warning"
        ? "status-warning"
        : status === "error"
          ? "status-error"
          : status === "signal"
            ? "status-signal"
            : "status-warning";
  const title =
    status === "healthy"
      ? "Healthy"
      : status === "warning"
        ? "Degraded"
        : status === "error"
          ? "Down"
          : status === "signal"
            ? "Signal"
            : "Unknown";
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-1 text-xs font-semibold text-text-light"
      title={title}
    >
      <span className={`status-dot ${statusClass}`} />
      <span>{title}</span>
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
