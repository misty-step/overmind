import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

type LatestMetrics = {
  visits: number;
  devices: number;
  bounceRate: number;
  healthy: boolean;
  responseTime?: number;
  statusCode?: number;
  snapshotAt: number;
};

type ProductWithMetrics = Doc<"products"> & {
  latestMetrics: LatestMetrics | null;
  stripeMetrics: { mrr: number; subscribers: number } | null;
};

export const getLatest = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify product ownership
    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== identity.subject) return null;

    const snapshots = await ctx.db
      .query("metricsSnapshots")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(1);

    return snapshots[0] ?? null;
  },
});

export const getHistory = query({
  args: {
    productId: v.id("products"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify product ownership
    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== identity.subject) return [];

    const days = args.days ?? 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("metricsSnapshots")
      .withIndex("by_product", (q) =>
        q.eq("productId", args.productId).gte("snapshotAt", since)
      )
      .order("asc")
      .collect();
  },
});

export const record = internalMutation({
  args: {
    productId: v.id("products"),
    visits: v.number(),
    devices: v.number(),
    bounceRate: v.number(),
    healthy: v.boolean(),
    responseTime: v.optional(v.number()),
    statusCode: v.optional(v.number()),
    revenue: v.optional(v.number()),
    subscribers: v.optional(v.number()),
    errorCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Called by actions; keep public API closed.
    return await ctx.db.insert("metricsSnapshots", {
      ...args,
      snapshotAt: Date.now(),
    });
  },
});

export const getProductsWithLatestMetrics = query({
  args: {},
  handler: async (ctx): Promise<ProductWithMetrics[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const productsWithMetrics = await Promise.all(
      products.map(async (product) => {
        const snapshots = await ctx.db
          .query("metricsSnapshots")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .take(1);

        // Get Stripe revenue metrics if product has stripeProductId
        let stripeMetrics: { mrr: number; subscribers: number } | null = null;
        if (product.stripeProductId) {
          stripeMetrics = await ctx.runQuery(internal.stripe.getRevenueMetrics, {
            stripeProductId: product.stripeProductId,
          });
        }

        const snapshot = snapshots[0] ?? null;

        // Prefer real-time health from cron (lastHealthCheck) over snapshot data
        // This enables real-time updates via Convex reactivity
        const latestMetrics: LatestMetrics | null = snapshot
          ? {
              visits: snapshot.visits,
              devices: snapshot.devices,
              bounceRate: snapshot.bounceRate,
              // Use cron health if more recent than snapshot
              healthy: product.lastHealthCheck && product.lastHealthCheck > snapshot.snapshotAt
                ? product.lastHealthy ?? snapshot.healthy
                : snapshot.healthy,
              responseTime: product.lastHealthCheck && product.lastHealthCheck > snapshot.snapshotAt
                ? product.lastResponseTime ?? snapshot.responseTime
                : snapshot.responseTime,
              statusCode: snapshot.statusCode,
              snapshotAt: Math.max(snapshot.snapshotAt, product.lastHealthCheck ?? 0),
            }
          : product.lastHealthCheck
            ? {
                visits: 0,
                devices: 0,
                bounceRate: 0,
                healthy: product.lastHealthy ?? false,
                responseTime: product.lastResponseTime,
                snapshotAt: product.lastHealthCheck,
              }
            : null;

        return {
          ...product,
          latestMetrics,
          stripeMetrics,
        };
      })
    );

    return productsWithMetrics;
  },
});
