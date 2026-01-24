"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

const DAY_MS = 24 * 60 * 60 * 1000;

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && "total" in value) {
    const total = (value as { total?: unknown }).total;
    if (typeof total === "number" && Number.isFinite(total)) return total;
  }
  return null;
};

const extractMetrics = (
  payload: unknown
): { visits: number; devices: number; bounceRate: number } | null => {
  const candidates = [
    payload,
    (payload as { data?: unknown })?.data,
    (payload as { stats?: unknown })?.stats,
    (payload as { result?: unknown })?.result,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    const visits = readNumber(record.visits);
    const devices = readNumber(record.devices);
    const bounceRate = readNumber(record.bounceRate ?? record.bounce_rate);

    if (visits !== null && devices !== null && bounceRate !== null) {
      return { visits, devices, bounceRate };
    }
  }

  return null;
};

export const fetchAnalytics = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.get, { id: args.productId });
    if (!product?.vercelProjectId) return null;

    const connections = await ctx.runQuery(api.connections.list, {});
    const vercel = connections.find(
      (connection: { service: string; accessToken: string }) =>
        connection.service === "vercel"
    );
    if (!vercel?.accessToken) return null;

    const now = Date.now();
    const from = now - 7 * DAY_MS;
    const url = new URL("https://vercel.com/api/v1/web-analytics/stats");
    url.searchParams.set("projectId", product.vercelProjectId);
    url.searchParams.set("from", String(from));
    url.searchParams.set("to", String(now));

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${vercel.accessToken}` },
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as unknown;
      return extractMetrics(payload);
    } catch (error) {
      return null;
    }
  },
});
