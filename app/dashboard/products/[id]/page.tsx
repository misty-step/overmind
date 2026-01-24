"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StatsCard } from "@/app/components/stats-card";

type ProductStatus = "healthy" | "warning" | "error" | "signal";

function resolveStatus(metrics: { visits: number; healthy: boolean }): ProductStatus {
  if (!metrics.healthy) return "error";
  if (metrics.visits > 100) return "signal";
  return "healthy";
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as Id<"products">;

  const product = useQuery(api.products.get, { id: productId });
  const metrics = useQuery(api.metrics.getLatest, { productId });
  const history = useQuery(api.metrics.getHistory, { productId, days: 7 });
  const removeProduct = useMutation(api.products.remove);
  const refreshProduct = useAction(api.actions.refresh.refreshProduct);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (product === undefined) {
    return (
      <div className="p-8">
        <div className="text-text-dim">Loading...</div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="p-8">
        <div className="card p-12 text-center">
          <h2 className="text-xl font-display font-semibold text-text-light mb-2">
            Product not found
          </h2>
          <p className="text-text-dim mb-4">
            This product doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard/products"
            className="btn-primary px-4 py-2 text-sm font-medium inline-block"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeProduct({ id: productId });
      router.push("/dashboard/products");
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProduct({ productId });
    } finally {
      setIsRefreshing(false);
    }
  };

  const status = metrics ? resolveStatus(metrics) : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/products"
              className="text-text-dim hover:text-text-light transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-display font-semibold text-text-light">
              {product.name}
            </h1>
            {status && <StatusBadge status={status} />}
          </div>
          <a
            href={`https://${product.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-mid hover:text-hive transition-colors"
          >
            {product.domain}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${productId}/edit`}
            className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
          >
            Edit
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary px-4 py-2 text-sm font-medium text-text-light inline-flex items-center gap-2 disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v6h6M20 20v-6h-6M5.5 9A7 7 0 0 1 18 7.5M18.5 15A7 7 0 0 1 6 16.5"
              />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-spore hover:bg-spore/10 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Visits"
          value={metrics?.visits?.toLocaleString() ?? "—"}
          subtext="Last 7 days"
          status={metrics && metrics.visits > 100 ? "signal" : undefined}
        />
        <StatsCard
          label="Devices"
          value={metrics?.devices?.toLocaleString() ?? "—"}
          subtext="Unique devices"
        />
        <StatsCard
          label="Bounce Rate"
          value={metrics?.bounceRate ? `${metrics.bounceRate}%` : "—"}
          subtext="Visitors who left quickly"
        />
        <StatsCard
          label="Health"
          value={metrics?.healthy ? "Online" : metrics === null ? "—" : "Offline"}
          status={metrics?.healthy ? "healthy" : metrics === null ? undefined : "error"}
          subtext={metrics?.responseTime ? `${metrics.responseTime}ms` : undefined}
        />
      </div>

      {/* Product Details */}
      <div className="card p-6 mb-8">
        <h2 className="font-display font-medium text-text-light mb-4">Details</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {product.description && (
            <div>
              <dt className="text-sm text-text-dim mb-1">Description</dt>
              <dd className="text-text-light">{product.description}</dd>
            </div>
          )}
          {product.category && (
            <div>
              <dt className="text-sm text-text-dim mb-1">Category</dt>
              <dd className="text-text-light capitalize">{product.category.replace("_", " ")}</dd>
            </div>
          )}
          {product.vercelProjectId && (
            <div>
              <dt className="text-sm text-text-dim mb-1">Vercel Project</dt>
              <dd className="text-text-light font-mono text-sm">{product.vercelProjectId}</dd>
            </div>
          )}
          {product.githubRepo && (
            <div>
              <dt className="text-sm text-text-dim mb-1">GitHub</dt>
              <dd>
                <a
                  href={`https://github.com/${product.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hive hover:underline"
                >
                  {product.githubRepo}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* History placeholder */}
      {history && history.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-medium text-text-light mb-4">
            Last 7 Days
          </h2>
          <div className="text-text-dim text-sm">
            {history.length} data points recorded
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-bg-void/80 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="font-display font-semibold text-text-light mb-2">
              Delete {product.name}?
            </h3>
            <p className="text-text-dim text-sm mb-6">
              This will permanently delete this product and all its metrics history.
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-spore text-white rounded-lg hover:bg-spore/90 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary px-4 py-2 text-sm font-medium text-text-light"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const config = {
    healthy: { label: "Healthy", className: "bg-spawn/20 text-spawn border-spawn/30" },
    warning: { label: "Warning", className: "bg-caution/20 text-caution border-caution/30" },
    error: { label: "Down", className: "bg-spore/20 text-spore border-spore/30" },
    signal: { label: "Traction", className: "bg-hive/20 text-hive border-hive/30" },
  }[status];

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${config.className}`}>
      {config.label}
    </span>
  );
}
