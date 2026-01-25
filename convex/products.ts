import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== identity.subject) return null;

    return product;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("products", {
      ...args,
      userId: identity.subject,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    domain: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const product = await ctx.db.get(id);
    if (!product || product.userId !== identity.subject) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== identity.subject) {
      throw new Error("Product not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const importProduct = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .take(1);

    if (existing.length > 0) return false;

    const now = Date.now();
    await ctx.db.insert("products", {
      ...args,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    return true;
  },
});

export const listAllEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

export const updateHealth = internalMutation({
  args: {
    productId: v.id("products"),
    healthy: v.boolean(),
    responseTime: v.optional(v.number()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return;

    const failures = args.healthy ? 0 : (product.consecutiveFailures ?? 0) + 1;

    await ctx.db.patch(args.productId, {
      lastHealthy: args.healthy,
      lastResponseTime: args.responseTime,
      lastHealthCheck: args.checkedAt,
      consecutiveFailures: failures,
    });
  },
});
