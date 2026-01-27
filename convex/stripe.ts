import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Webhook signature verification is in actions/stripeWebhook.ts (Node runtime)

// Called by Stripe webhook handler
export const ingestEvent = internalMutation({
  args: {
    stripeProductId: v.string(),
    stripeEventId: v.string(),
    eventType: v.string(),
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event_id", (q) => q.eq("stripeEventId", args.stripeEventId))
      .first();

    if (existing) return;

    await ctx.db.insert("stripeEvents", {
      ...args,
      receivedAt: Date.now(),
    });
  },
});

export const getRevenueMetrics = internalQuery({
  args: {
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("stripeEvents")
      .withIndex("by_product", (q) =>
        q.eq("stripeProductId", args.stripeProductId)
      )
      .order("asc")
      .collect();

    if (events.length === 0) return { mrr: 0, subscribers: 0 };

    const activeSubscriptions = new Map<string, number>();

    for (const event of events) {
      if (!event.subscriptionId) continue;
      if (event.eventType === "subscription_created") {
        activeSubscriptions.set(event.subscriptionId, event.amountCents);
      } else if (event.eventType === "subscription_deleted") {
        activeSubscriptions.delete(event.subscriptionId);
      }
    }

    const mrr = Array.from(activeSubscriptions.values()).reduce(
      (total, amountCents) => total + amountCents,
      0
    );

    return { mrr, subscribers: activeSubscriptions.size };
  },
});

// Cleanup mutations for removing test data
export const clearAllStripeEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("stripeEvents").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
    return { deleted: events.length };
  },
});

export const clearTestModeStripeProductIds = internalMutation({
  args: {
    testModeProductIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    let cleared = 0;
    for (const product of products) {
      if (product.stripeProductId && args.testModeProductIds.includes(product.stripeProductId)) {
        await ctx.db.patch(product._id, { stripeProductId: undefined });
        cleared++;
      }
    }
    return { cleared };
  },
});
