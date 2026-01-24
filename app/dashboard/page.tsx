"use client";

import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { ProductCard, type ProductWithMetrics } from "@/app/components/product-card";
import { StatsCard } from "@/app/components/stats-card";

type ProductStatus = "healthy" | "warning" | "error" | "signal";

function resolveStatus(metrics: { visits: number; healthy: boolean }): ProductStatus {
  if (!metrics.healthy) return "error";
  if (metrics.visits > 100) return "signal";
  return "healthy";
}

export default function DashboardPage() {
  const rawProducts = useQuery(api.metrics.getProductsWithLatestMetrics);
  const isLoading = rawProducts === undefined;
  const refreshAll = useAction(api.actions.refreshAll.refreshAll);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const productsWithMetrics: ProductWithMetrics[] = (rawProducts ?? []).map(
    (product) => ({
      _id: product._id,
      name: product.name,
      domain: product.domain,
      description: product.description ?? undefined,
      category: product.category ?? undefined,
      latestMetrics: product.latestMetrics
        ? {
            visits: product.latestMetrics.visits,
            devices: product.latestMetrics.devices,
            bounceRate: product.latestMetrics.bounceRate,
            healthy: product.latestMetrics.healthy,
            responseTime: product.latestMetrics.responseTime ?? undefined,
            status: resolveStatus(product.latestMetrics),
          }
        : null,
    })
  );

  // Calculate totals
  const totalVisits = productsWithMetrics.reduce(
    (sum: number, p: ProductWithMetrics) => sum + (p.latestMetrics?.visits ?? 0),
    0
  );
  const healthyCount = productsWithMetrics.filter(
    (p: ProductWithMetrics) => p.latestMetrics?.healthy
  ).length;
  const tractionSignals = productsWithMetrics.filter(
    (p: ProductWithMetrics) => (p.latestMetrics?.visits ?? 0) > 100
  ).length;
  const responseTimes = productsWithMetrics
    .map((p: ProductWithMetrics) => p.latestMetrics?.responseTime ?? 0)
    .filter((responseTime) => responseTime > 0);
  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((sum, responseTime) => sum + responseTime, 0) /
            responseTimes.length
        )
      : null;
  const responseStatus =
    averageResponseTime === null
      ? undefined
      : averageResponseTime < 800
        ? "healthy"
        : averageResponseTime < 2000
          ? "warning"
          : "error";

  const now = new Date();
  const weekOf = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshAll({});
      setRefreshNotice(
        `Updated ${result.successCount} of ${result.total} products`
      );
    } catch (error) {
      setRefreshNotice("Refresh failed. Try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!refreshNotice) return;
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = window.setTimeout(() => {
      setRefreshNotice(null);
    }, 4000);
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, [refreshNotice]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-text-light">
            Dashboard
          </h1>
          <p className="text-text-dim">Week of {weekOf}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold text-text-light">
            Overview
          </h2>
          <p className="text-text-dim text-sm">Health checks and traffic</p>
        </div>
        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="btn-primary px-5 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
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
          {isRefreshing ? "Refreshing..." : "Refresh All"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Visits"
          value={totalVisits.toLocaleString()}
          subtext="Last 7 days"
        />
        <StatsCard
          label="Sites Online"
          value={`${healthyCount} online`}
          subtext={`${productsWithMetrics.length} total`}
          status={
            healthyCount === productsWithMetrics.length ? "healthy" : "warning"
          }
        />
        <StatsCard
          label="Avg Response"
          value={averageResponseTime ? `${averageResponseTime}ms` : "—"}
          subtext={responseTimes.length > 0 ? "Last check" : "No data yet"}
          status={responseStatus}
        />
        <StatsCard
          label="Traction Signals"
          value={tractionSignals.toString()}
          subtext=">100 visits/week"
          status={tractionSignals > 0 ? "signal" : undefined}
        />
      </div>

      {refreshNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-20 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text-light shadow-lg"
        >
          {refreshNotice}
        </div>
      )}

      {/* Products grid */}
      {isLoading ? (
        <div className="text-text-dim">Loading products...</div>
      ) : productsWithMetrics.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsWithMetrics.map((product: ProductWithMetrics) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-bg-elevated mx-auto mb-4 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-text-dim"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      <h3 className="font-display font-medium text-text-light mb-2">
        No products yet
      </h3>
      <p className="text-text-dim text-sm mb-4">
        Add your first product to start tracking.
      </p>
      <Link
        href="/dashboard/products/new"
        className="inline-flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Product
      </Link>
    </div>
  );
}
