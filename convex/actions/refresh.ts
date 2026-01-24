"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const TIMEOUT_MS = 10_000;

const toHttpsUrl = (domain: string) => {
  const trimmed = domain.trim();
  const normalized = trimmed.replace(/^https?:\/\//, "");
  return `https://${normalized}`;
};

export const refreshProduct = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const product = await ctx.runQuery(api.products.get, { id: args.productId });
    const logPrefix = `[refresh:${args.productId}]`;

    // Fetch analytics from drain data and health check in parallel
    const [analytics, health] = await Promise.all([
      // Analytics: aggregate from stored drain events
      (async () => {
        if (!product?.vercelProjectId) {
          console.log(`${logPrefix} analytics skipped: missing vercelProjectId`);
          return { visits: 0, devices: 0, bounceRate: 0 };
        }

        const result = await ctx.runQuery(internal.analytics.aggregateForProject, {
          vercelProjectId: product.vercelProjectId,
          days: 7,
        });

        console.log(`${logPrefix} analytics from drain`, result);
        return result;
      })(),

      // Health check: HTTP request to domain
      (async () => {
        if (!product?.domain) {
          console.log(`${logPrefix} health skipped: missing domain`);
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
          const result = { healthy, responseTime, statusCode };
          console.log(`${logPrefix} health check`, {
            domain: product.domain,
            ...result,
          });
          return result;
        } catch (error) {
          const responseTime = Date.now() - startedAt;
          const result = { healthy: false, responseTime, statusCode: 0 };
          console.log(`${logPrefix} health check failed`, {
            domain: product.domain,
            message: error instanceof Error ? error.message : String(error),
            responseTime,
          });
          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      })(),
    ]);

    await ctx.runMutation(internal.metrics.record, {
      productId: args.productId,
      visits: analytics.visits,
      devices: analytics.devices,
      bounceRate: analytics.bounceRate,
      healthy: health.healthy,
      responseTime: health.responseTime,
      statusCode: health.statusCode,
    });

    const success = health.statusCode !== 0;
    return { success };
  },
});
