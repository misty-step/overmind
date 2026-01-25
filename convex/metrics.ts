import { v } from "convex/values";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
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

export type Signal =
  | "traction"
  | "healthy"
  | "degraded"
  | "dead"
  | "awaiting-data";

const SIGNAL_PRIORITY: Record<Signal, number> = {
  traction: 0,
  degraded: 1,
  healthy: 2,
  "awaiting-data": 3,
  dead: 4,
};

type SignalThresholds = {
  tractionThreshold: number;
  degradedResponseTime: number;
  degradedDeclinePercent: number;
};

const DEFAULT_SIGNAL_THRESHOLDS: SignalThresholds = {
  tractionThreshold: 100,
  degradedResponseTime: 2000,
  degradedDeclinePercent: 30,
};

type StripeMetrics = { mrr: number; subscribers: number };
type MetricsSnapshot = Doc<"metricsSnapshots">;

const DAY_MS = 24 * 60 * 60 * 1000;

const calculateGrowth = (history: MetricsSnapshot[]): number | null => {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  const targetAt = latest.snapshotAt - 7 * DAY_MS;

  let previous: MetricsSnapshot | null = null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].snapshotAt <= targetAt) {
      previous = history[i];
      break;
    }
  }

  if (!previous || previous.visits === 0) return null;
  return ((latest.visits - previous.visits) / previous.visits) * 100;
};

const getDaysSinceTraffic = (history: MetricsSnapshot[]): number | null => {
  if (history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].visits > 0) {
      return Math.floor((Date.now() - history[i].snapshotAt) / DAY_MS);
    }
  }
  return null;
};

const computeSignal = (
  metrics: LatestMetrics | null,
  history: MetricsSnapshot[],
  settings: SignalThresholds,
  stripeMetrics: StripeMetrics | null
): { signal: Signal; growth: number | null } => {
  const growth = calculateGrowth(history);
  const daysSinceTraffic = getDaysSinceTraffic(history);
  const hasRevenue =
    (stripeMetrics?.mrr ?? 0) > 0 || (stripeMetrics?.subscribers ?? 0) > 0;

  // Awaiting data: no data at all
  if (!metrics && history.length === 0) {
    return { signal: "awaiting-data", growth };
  }

  // Awaiting data: less than 7 days of history
  if (history.length > 0) {
    const latestSnapshotAt = history[history.length - 1].snapshotAt;
    const hasWeekOfHistory = history.some(
      (s) => s.snapshotAt <= latestSnapshotAt - 7 * DAY_MS
    );
    if (!hasWeekOfHistory) {
      return { signal: "awaiting-data", growth };
    }
  }

  // Dead: no traffic for 7+ days (spec says 7, not 14)
  if (history.length > 0) {
    if (daysSinceTraffic === null && !hasRevenue) {
      return { signal: "dead", growth };
    }
    if (daysSinceTraffic !== null && daysSinceTraffic >= 7 && !hasRevenue) {
      return { signal: "dead", growth };
    }
  }

  // Traction: visits > threshold OR growth > 50% OR has revenue
  const visits = metrics?.visits ?? 0;
  const hasHighGrowth = growth !== null && growth > 50;
  if (visits >= settings.tractionThreshold || hasHighGrowth || hasRevenue) {
    return { signal: "traction", growth };
  }

  // Degraded: slow response, unhealthy, or declining
  const responseTime = metrics?.responseTime;
  const degradedFromHealth = metrics ? !metrics.healthy : false;
  const degradedFromResponseTime =
    responseTime !== undefined && responseTime > settings.degradedResponseTime;
  const degradedFromDecline =
    growth !== null && growth <= -Math.abs(settings.degradedDeclinePercent);

  if (degradedFromHealth || degradedFromResponseTime || degradedFromDecline) {
    return { signal: "degraded", growth };
  }

  return { signal: "healthy", growth };
};

const mergeHealthMetrics = (
  product: Doc<"products">,
  snapshot: MetricsSnapshot | null
): LatestMetrics | null => {
  if (!snapshot) {
    return product.lastHealthCheck
      ? {
          visits: 0,
          devices: 0,
          bounceRate: 0,
          healthy: product.lastHealthy ?? false,
          responseTime: product.lastResponseTime,
          snapshotAt: product.lastHealthCheck,
        }
      : null;
  }

  const isCronHealthNewer =
    product.lastHealthCheck && product.lastHealthCheck > snapshot.snapshotAt;

  return {
    visits: snapshot.visits,
    devices: snapshot.devices,
    bounceRate: snapshot.bounceRate,
    healthy: isCronHealthNewer
      ? product.lastHealthy ?? snapshot.healthy
      : snapshot.healthy,
    responseTime: isCronHealthNewer
      ? product.lastResponseTime ?? snapshot.responseTime
      : snapshot.responseTime,
    statusCode: snapshot.statusCode,
    snapshotAt: Math.max(snapshot.snapshotAt, product.lastHealthCheck ?? 0),
  };
};

type ProductWithMetrics = Doc<"products"> & {
  latestMetrics: LatestMetrics | null;
  stripeMetrics: StripeMetrics | null;
  signal: Signal;
  growth: number | null;
};

const enrichProductWithMetrics = async (
  ctx: QueryCtx,
  product: Doc<"products">,
  signalThresholds: SignalThresholds,
  historySince: number
): Promise<ProductWithMetrics> => {
  const snapshots = await ctx.db
    .query("metricsSnapshots")
    .withIndex("by_product", (q) => q.eq("productId", product._id))
    .order("desc")
    .take(1);

  const history = await ctx.db
    .query("metricsSnapshots")
    .withIndex("by_product", (q) =>
      q.eq("productId", product._id).gte("snapshotAt", historySince)
    )
    .order("asc")
    .collect();

  let stripeMetrics: StripeMetrics | null = null;
  if (product.stripeProductId) {
    stripeMetrics = await ctx.runQuery(internal.stripe.getRevenueMetrics, {
      stripeProductId: product.stripeProductId,
    });
  }

  const snapshot = snapshots[0] ?? null;
  const latestMetrics = mergeHealthMetrics(product, snapshot);
  const { signal, growth } = computeSignal(
    latestMetrics,
    history,
    signalThresholds,
    stripeMetrics
  );

  return {
    ...product,
    latestMetrics,
    stripeMetrics,
    signal,
    growth,
  };
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

    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const signalThresholds: SignalThresholds = {
      tractionThreshold:
        userSettings?.tractionThreshold ??
        DEFAULT_SIGNAL_THRESHOLDS.tractionThreshold,
      degradedResponseTime:
        userSettings?.degradedResponseTime ??
        DEFAULT_SIGNAL_THRESHOLDS.degradedResponseTime,
      degradedDeclinePercent:
        userSettings?.degradedDeclinePercent ??
        DEFAULT_SIGNAL_THRESHOLDS.degradedDeclinePercent,
    };

    const products = await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const historySince = Date.now() - 14 * DAY_MS;

    const productsWithMetrics = await Promise.all(
      products.map((product) =>
        enrichProductWithMetrics(ctx, product, signalThresholds, historySince)
      )
    );

    return productsWithMetrics.sort((a, b) => {
      const priorityDiff = SIGNAL_PRIORITY[a.signal] - SIGNAL_PRIORITY[b.signal];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  },
});
