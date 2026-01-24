import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const serviceValidator = v.union(
  v.literal("vercel"),
  v.literal("stripe"),
  v.literal("sentry"),
  v.literal("github")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    service: serviceValidator,
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user_and_service", (q) =>
        q.eq("userId", identity.subject).eq("service", args.service)
      )
      .collect();

    const current = existing[0] ?? null;
    const now = Date.now();

    if (!current) {
      const connection = {
        userId: identity.subject,
        service: args.service,
        accessToken: args.accessToken,
        createdAt: now,
        updatedAt: now,
        ...(args.refreshToken !== undefined ? { refreshToken: args.refreshToken } : {}),
        ...(args.expiresAt !== undefined ? { expiresAt: args.expiresAt } : {}),
        ...(args.scope !== undefined ? { scope: args.scope } : {}),
      };

      await ctx.db.insert("connections", connection);
      return;
    }

    const updates: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
      scope?: string;
      updatedAt: number;
    } = { accessToken: args.accessToken, updatedAt: now };

    if (args.refreshToken !== undefined) updates.refreshToken = args.refreshToken;
    if (args.expiresAt !== undefined) updates.expiresAt = args.expiresAt;
    if (args.scope !== undefined) updates.scope = args.scope;

    await ctx.db.patch(current._id, updates);
  },
});

export const remove = mutation({
  args: { service: serviceValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user_and_service", (q) =>
        q.eq("userId", identity.subject).eq("service", args.service)
      )
      .collect();

    const current = existing[0] ?? null;
    if (!current) return;

    await ctx.db.delete(current._id);
  },
});
