"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

const TIMEOUT_MS = 10_000;

const toHttpsUrl = (domain: string) => {
  const trimmed = domain.trim();
  const normalized = trimmed.replace(/^https?:\/\//, "");
  return `https://${normalized}`;
};

export const checkHealth = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.get, { id: args.productId });
    if (!product?.domain) {
      return { healthy: false, responseTime: 0, statusCode: 0 };
    }

    const target = toHttpsUrl(product.domain);
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(target, { signal: controller.signal });
      const responseTime = Date.now() - startedAt;
      const statusCode = response.status;
      const healthy = statusCode >= 200 && statusCode < 400;
      return { healthy, responseTime, statusCode };
    } catch (error) {
      const responseTime = Date.now() - startedAt;
      return { healthy: false, responseTime, statusCode: 0 };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});
