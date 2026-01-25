"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProductCard, type ProductWithMetrics } from "@/app/components/product-card";

export default function ProductsPage() {
  const products = useQuery(api.metrics.getProductsWithLatestMetrics);
  const isLoading = products === undefined;

  const productsWithMetrics: ProductWithMetrics[] = (products ?? []).map(
    (product) => ({
      _id: product._id,
      name: product.name,
      domain: product.domain,
      description: product.description ?? undefined,
      category: product.category ?? undefined,
      signal: product.signal,
      growth: product.growth ?? null,
      latestMetrics: product.latestMetrics
        ? {
            visits: product.latestMetrics.visits,
            devices: product.latestMetrics.devices,
            bounceRate: product.latestMetrics.bounceRate,
            healthy: product.latestMetrics.healthy,
            responseTime: product.latestMetrics.responseTime ?? undefined,
          }
        : null,
      stripeMetrics: product.stripeMetrics ?? undefined,
    })
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-text-light">
            Products
          </h1>
          <p className="text-text-dim">Manage your tracked products.</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Product
        </Link>
      </div>

      {isLoading ? (
        <div className="text-text-dim">Loading products...</div>
      ) : productsWithMetrics.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsWithMetrics.map((product) => (
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
