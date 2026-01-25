"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const TIMEOUT_MS = 10_000;

const toHttpsUrl = (domain: string) => {
  const trimmed = domain.trim();
  const normalized = trimmed.replace(/^https?:\/\//, "");
  return `https://${normalized}`;
};

type HealthResult = {
  healthy: boolean;
  responseTime: number;
  statusCode: number;
};

const checkHealth = async (
  domain: string | undefined,
  logPrefix: string
): Promise<HealthResult> => {
  const trimmedDomain = domain?.trim();
  if (!trimmedDomain) {
    console.log(`${logPrefix} health skipped: missing domain`);
    return { healthy: false, responseTime: 0, statusCode: 0 };
  }

  const target = toHttpsUrl(trimmedDomain);
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
      domain,
      ...result,
    });
    return result;
  } catch (error) {
    const responseTime = Date.now() - startedAt;
    const result = { healthy: false, responseTime, statusCode: 0 };
    console.log(`${logPrefix} health check failed`, {
      domain,
      message: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const runHealthChecks = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number }> => {
    const products = await ctx.runQuery(internal.products.listAllEnabled, {});

    await Promise.all(
      products.map(async (product) => {
        const logPrefix = `[health:${product._id}]`;
        const result = await checkHealth(product.domain, logPrefix);
        await ctx.runMutation(internal.products.updateHealth, {
          productId: product._id,
          healthy: result.healthy,
          responseTime: result.responseTime,
          checkedAt: Date.now(),
        });
      })
    );

    return { checked: products.length };
  },
});
