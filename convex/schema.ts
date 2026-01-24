import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Raw analytics events from Vercel Drain
  analyticsEvents: defineTable({
    vercelProjectId: v.string(),
    eventType: v.string(), // "pageview" or "event"
    eventName: v.optional(v.string()),
    sessionId: v.number(),
    deviceId: v.number(),
    path: v.string(),
    referrer: v.optional(v.string()),
    country: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    timestamp: v.number(),
    receivedAt: v.number(),
  })
    .index("by_project_time", ["vercelProjectId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),


  products: defineTable({
    name: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    stripeProductId: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    userId: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_domain", ["domain"]),

  metricsSnapshots: defineTable({
    productId: v.id("products"),
    // Traffic metrics (from Vercel Analytics)
    visits: v.number(),
    devices: v.number(),
    bounceRate: v.number(),
    // Health metrics
    healthy: v.boolean(),
    responseTime: v.optional(v.number()),
    statusCode: v.optional(v.number()),
    // Revenue metrics (from Stripe, future)
    revenue: v.optional(v.number()),
    subscribers: v.optional(v.number()),
    // Error metrics (from Sentry, future)
    errorCount: v.optional(v.number()),
    // Timestamp
    snapshotAt: v.number(),
  })
    .index("by_product", ["productId", "snapshotAt"])
    .index("by_snapshot_date", ["snapshotAt"]),

  connections: defineTable({
    userId: v.string(),
    service: v.union(
      v.literal("vercel"),
      v.literal("stripe"),
      v.literal("sentry"),
      v.literal("github")
    ),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_service", ["userId", "service"]),

  userSettings: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    // Notification preferences
    emailNotifications: v.boolean(),
    notifyOnTraction: v.boolean(),
    notifyOnDown: v.boolean(),
    // Display preferences
    defaultView: v.union(v.literal("grid"), v.literal("table")),
    theme: v.union(v.literal("dark"), v.literal("light"), v.literal("system")),
    // Thresholds
    tractionThreshold: v.number(), // visits/week to trigger "traction signal"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
