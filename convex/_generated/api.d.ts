/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_health from "../actions/health.js";
import type * as actions_healthCheck from "../actions/healthCheck.js";
import type * as actions_import from "../actions/import.js";
import type * as actions_refresh from "../actions/refresh.js";
import type * as actions_refreshAll from "../actions/refreshAll.js";
import type * as actions_stripeWebhook from "../actions/stripeWebhook.js";
import type * as actions_vercel from "../actions/vercel.js";
import type * as analytics from "../analytics.js";
import type * as connections from "../connections.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as metrics from "../metrics.js";
import type * as products from "../products.js";
import type * as settings from "../settings.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/health": typeof actions_health;
  "actions/healthCheck": typeof actions_healthCheck;
  "actions/import": typeof actions_import;
  "actions/refresh": typeof actions_refresh;
  "actions/refreshAll": typeof actions_refreshAll;
  "actions/stripeWebhook": typeof actions_stripeWebhook;
  "actions/vercel": typeof actions_vercel;
  analytics: typeof analytics;
  connections: typeof connections;
  crons: typeof crons;
  http: typeof http;
  metrics: typeof metrics;
  products: typeof products;
  settings: typeof settings;
  stripe: typeof stripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
