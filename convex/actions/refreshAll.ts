"use node";

import { action } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

export const refreshAll = action({
  args: {},
  handler: async (ctx): Promise<{ total: number; successCount: number; failedCount: number }> => {
    const products = await ctx.runQuery(api.products.list, {});

    const results = await Promise.allSettled(
      products.map((product: { _id: Id<"products"> }) =>
        ctx.runAction(api.actions.refresh.refreshProduct, {
          productId: product._id,
        })
      )
    );

    const successCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value?.success === true
    ).length;

    return {
      total: products.length,
      successCount,
      failedCount: products.length - successCount,
    };
  },
});
