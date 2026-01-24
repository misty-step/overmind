import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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
  handler: async (ctx) => {
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

        return {
          ...product,
          latestMetrics: snapshots[0] ?? null,
        };
      })
    );

    return productsWithMetrics;
  },
});
