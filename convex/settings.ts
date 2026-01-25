import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

const defaultSettings = {
  emailNotifications: true,
  notifyOnTraction: true,
  notifyOnDown: true,
  defaultView: "grid" as const,
  theme: "system" as const,
  tractionThreshold: 100,
  degradedResponseTime: 2000,
  degradedDeclinePercent: 30,
};

const getUserSettings = async (ctx: QueryCtx | MutationCtx, userId: string) => {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return settings[0] ?? null;
};

const ensureUserSettings = async (
  ctx: MutationCtx,
  userId: string,
  email?: string
) => {
  const existing = await getUserSettings(ctx, userId);
  if (existing) return existing;

  const now = Date.now();
  const settings = {
    userId,
    emailNotifications: defaultSettings.emailNotifications,
    notifyOnTraction: defaultSettings.notifyOnTraction,
    notifyOnDown: defaultSettings.notifyOnDown,
    defaultView: defaultSettings.defaultView,
    theme: defaultSettings.theme,
    tractionThreshold: defaultSettings.tractionThreshold,
    degradedResponseTime: defaultSettings.degradedResponseTime,
    degradedDeclinePercent: defaultSettings.degradedDeclinePercent,
    createdAt: now,
    updatedAt: now,
    ...(email !== undefined ? { email } : {}),
  };

  const id = await ctx.db.insert("userSettings", settings);
  return { _id: id, ...settings };
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
    degradedResponseTime: v.optional(v.number()),
    degradedDeclinePercent: v.optional(v.number()),
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
        degradedResponseTime:
          args.degradedResponseTime ?? defaultSettings.degradedResponseTime,
        degradedDeclinePercent:
          args.degradedDeclinePercent ?? defaultSettings.degradedDeclinePercent,
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
      degradedResponseTime?: number;
      degradedDeclinePercent?: number;
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
    if (args.degradedResponseTime !== undefined) {
      updates.degradedResponseTime = args.degradedResponseTime;
    }
    if (args.degradedDeclinePercent !== undefined) {
      updates.degradedDeclinePercent = args.degradedDeclinePercent;
    }

    await ctx.db.patch(current._id, updates);
  },
});

export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const settings = await getUserSettings(ctx, identity.subject);

    return {
      completed: settings?.onboardingCompleted ?? false,
      currentStep: settings?.onboardingStep ?? 0,
    };
  },
});

export const advanceOnboardingStep = mutation({
  args: { step: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.step < 0 || args.step > 5) {
      throw new Error("Invalid onboarding step");
    }

    const settings = await ensureUserSettings(ctx, identity.subject, identity.email);
    const updates: {
      onboardingStep: number;
      onboardingCompleted?: boolean;
      updatedAt: number;
    } = {
      onboardingStep: args.step,
      updatedAt: Date.now(),
    };

    if (args.step === 5) updates.onboardingCompleted = true;

    await ctx.db.patch(settings._id, updates);
  },
});

export const skipOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const settings = await ensureUserSettings(ctx, identity.subject, identity.email);
    await ctx.db.patch(settings._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
  },
});

export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const settings = await ensureUserSettings(ctx, identity.subject, identity.email);
    await ctx.db.patch(settings._id, {
      onboardingCompleted: false,
      onboardingStep: 0,
      updatedAt: Date.now(),
    });
  },
});
