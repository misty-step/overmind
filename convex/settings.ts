import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const defaultSettings = {
  emailNotifications: true,
  notifyOnTraction: true,
  notifyOnDown: true,
  defaultView: "grid" as const,
  theme: "system" as const,
  tractionThreshold: 100,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return settings[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    email: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    notifyOnTraction: v.optional(v.boolean()),
    notifyOnDown: v.optional(v.boolean()),
    defaultView: v.optional(v.union(v.literal("grid"), v.literal("table"))),
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
    tractionThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const current = existing[0] ?? null;
    const now = Date.now();

    if (!current) {
      const email = args.email ?? identity.email;
      const settings = {
        userId: identity.subject,
        emailNotifications: args.emailNotifications ?? defaultSettings.emailNotifications,
        notifyOnTraction: args.notifyOnTraction ?? defaultSettings.notifyOnTraction,
        notifyOnDown: args.notifyOnDown ?? defaultSettings.notifyOnDown,
        defaultView: args.defaultView ?? defaultSettings.defaultView,
        theme: args.theme ?? defaultSettings.theme,
        tractionThreshold: args.tractionThreshold ?? defaultSettings.tractionThreshold,
        createdAt: now,
        updatedAt: now,
        ...(email !== undefined ? { email } : {}),
      };

      await ctx.db.insert("userSettings", settings);
      return;
    }

    const updates: {
      email?: string;
      emailNotifications?: boolean;
      notifyOnTraction?: boolean;
      notifyOnDown?: boolean;
      defaultView?: "grid" | "table";
      theme?: "dark" | "light" | "system";
      tractionThreshold?: number;
      updatedAt: number;
    } = { updatedAt: now };

    if (args.email !== undefined) updates.email = args.email;
    if (args.emailNotifications !== undefined) {
      updates.emailNotifications = args.emailNotifications;
    }
    if (args.notifyOnTraction !== undefined) {
      updates.notifyOnTraction = args.notifyOnTraction;
    }
    if (args.notifyOnDown !== undefined) updates.notifyOnDown = args.notifyOnDown;
    if (args.defaultView !== undefined) updates.defaultView = args.defaultView;
    if (args.theme !== undefined) updates.theme = args.theme;
    if (args.tractionThreshold !== undefined) {
      updates.tractionThreshold = args.tractionThreshold;
    }

    await ctx.db.patch(current._id, updates);
  },
});
