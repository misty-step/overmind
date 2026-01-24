import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;

// Called by HTTP drain endpoint
export const ingestEvent = internalMutation({
  args: {
    vercelProjectId: v.string(),
    eventType: v.string(),
    eventName: v.optional(v.string()),
    sessionId: v.number(),
    deviceId: v.number(),
    path: v.string(),
    referrer: v.optional(v.string()),
    country: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyticsEvents", {
      ...args,
      receivedAt: Date.now(),
    });
  },
});

// Aggregate analytics for a Vercel project over the last N days
export const aggregateForProject = internalQuery({
  args: {
    vercelProjectId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const since = Date.now() - days * DAY_MS;

    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_project_time", (q) =>
        q.eq("vercelProjectId", args.vercelProjectId).gte("timestamp", since)
      )
      .collect();

    if (events.length === 0) {
      return { visits: 0, devices: 0, bounceRate: 0, pageviews: 0 };
    }

    // Count unique sessions (visits) and devices
    const uniqueSessions = new Set(events.map((e) => e.sessionId));
    const uniqueDevices = new Set(events.map((e) => e.deviceId));

    // Calculate bounce rate: sessions with only 1 pageview
    const sessionPageviews = new Map<number, number>();
    for (const event of events) {
      if (event.eventType === "pageview") {
        sessionPageviews.set(
          event.sessionId,
          (sessionPageviews.get(event.sessionId) ?? 0) + 1
        );
      }
    }
    const bouncedSessions = Array.from(sessionPageviews.values()).filter(
      (count) => count === 1
    ).length;
    const bounceRate =
      sessionPageviews.size > 0
        ? Math.round((bouncedSessions / sessionPageviews.size) * 100)
        : 0;

    return {
      visits: uniqueSessions.size,
      devices: uniqueDevices.size,
      bounceRate,
      pageviews: events.filter((e) => e.eventType === "pageview").length,
    };
  },
});

// Cleanup old events (call from cron)
export const cleanupOldEvents = internalMutation({
  args: { daysToKeep: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep ?? 30;
    const cutoff = Date.now() - daysToKeep * DAY_MS;

    const oldEvents = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(1000); // Batch delete

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }

    return { deleted: oldEvents.length };
  },
});
