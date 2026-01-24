"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { load } from "js-yaml";

type ProductInput = {
  name: string;
  domain: string;
  description?: string;
  category?: string;
  vercelProjectId?: string;
  stripeProductId?: string;
  githubRepo?: string;
};

const readRequiredString = (value: unknown, label: string, index: number) => {
  if (typeof value !== "string") {
    throw new Error(`Invalid product at index ${index}: ${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Invalid product at index ${index}: ${label} is required`);
  }
  return trimmed;
};

const readOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeProduct = (value: unknown, index: number): ProductInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid product at index ${index}: expected an object`);
  }

  const record = value as Record<string, unknown>;
  return {
    name: readRequiredString(record.name, "name", index),
    domain: readRequiredString(record.domain, "domain", index),
    description: readOptionalString(record.description),
    category: readOptionalString(record.category),
    vercelProjectId: readOptionalString(
      record.vercel_project_id ?? record.vercelProjectId
    ),
    stripeProductId: readOptionalString(
      record.stripe_product_id ?? record.stripeProductId
    ),
    githubRepo: readOptionalString(record.github_repo ?? record.githubRepo),
  };
};

export const importFromYaml = internalAction({
  args: { yaml: v.string() },
  handler: async (ctx, args): Promise<{ imported: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parsed = load(args.yaml);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid YAML: expected an object with products array");
    }

    const products = (parsed as { products?: unknown }).products;
    if (!Array.isArray(products)) {
      throw new Error("Invalid YAML: expected products array");
    }

    const seenDomains = new Set<string>();
    let imported = 0;

    for (let index = 0; index < products.length; index += 1) {
      const normalized = normalizeProduct(products[index], index);
      if (seenDomains.has(normalized.domain)) continue;
      seenDomains.add(normalized.domain);

      const created = await ctx.runMutation(internal.products.importProduct, {
        userId: identity.subject,
        ...normalized,
      });

      if (created) imported += 1;
    }

    return { imported };
  },
});

export const requestImportFromYaml = action({
  args: { yaml: v.string() },
  handler: async (ctx, args): Promise<{ imported: number }> => {
    return await ctx.runAction(internal.actions.import.importFromYaml, args);
  },
});
