import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Verify Stripe webhook signature and parse the event.
 * Returns the parsed event if valid, null if invalid.
 *
 * Stripe signature format: t=timestamp,v1=signature
 * Signed payload: `${timestamp}.${body}`
 */
export const verifyAndParseWebhook = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.string(),
  },
  handler: async (_, args): Promise<{
    valid: boolean;
    error?: string;
    event?: unknown;
  }> => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { valid: false, error: "STRIPE_WEBHOOK_SECRET not configured" };
    }

    // Parse signature header: t=timestamp,v1=signature
    const elements = args.signature.split(",");
    const timestampElement = elements.find((e) => e.startsWith("t="));
    const signatureElement = elements.find((e) => e.startsWith("v1="));

    if (!timestampElement || !signatureElement) {
      return { valid: false, error: "Invalid signature format" };
    }

    const timestamp = parseInt(timestampElement.slice(2), 10);
    const expectedSignature = signatureElement.slice(3);

    if (isNaN(timestamp)) {
      return { valid: false, error: "Invalid timestamp in signature" };
    }

    // Check timestamp tolerance to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
      return { valid: false, error: "Timestamp outside tolerance window" };
    }

    // Compute expected signature: HMAC-SHA256(secret, timestamp.body)
    const signedPayload = `${timestamp}.${args.rawBody}`;
    const computedSignature = createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(expectedSignature, "utf8");
    const computedBuffer = Buffer.from(computedSignature, "utf8");

    if (sigBuffer.length !== computedBuffer.length) {
      return { valid: false, error: "Signature mismatch" };
    }

    if (!timingSafeEqual(sigBuffer, computedBuffer)) {
      return { valid: false, error: "Signature mismatch" };
    }

    // Parse and return the event
    try {
      const event = JSON.parse(args.rawBody);
      return { valid: true, event };
    } catch {
      return { valid: false, error: "Invalid JSON body" };
    }
  },
});

// Called by Stripe webhook handler
export const ingestEvent = internalMutation({
  args: {
    stripeProductId: v.string(),
    stripeEventId: v.string(),
    eventType: v.string(),
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event_id", (q) => q.eq("stripeEventId", args.stripeEventId))
      .take(1);

    if (existing.length > 0) return;

    await ctx.db.insert("stripeEvents", {
      ...args,
      receivedAt: Date.now(),
    });
  },
});

export const getRevenueMetrics = internalQuery({
  args: {
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("stripeEvents")
      .withIndex("by_product", (q) =>
        q.eq("stripeProductId", args.stripeProductId)
      )
      .order("asc")
      .collect();

    if (events.length === 0) return { mrr: 0, subscribers: 0 };

    const activeSubscriptions = new Map<string, number>();

    for (const event of events) {
      if (!event.subscriptionId) continue;
      if (event.eventType === "subscription_created") {
        activeSubscriptions.set(event.subscriptionId, event.amountCents);
      } else if (event.eventType === "subscription_deleted") {
        activeSubscriptions.delete(event.subscriptionId);
      }
    }

    let mrr = 0;
    for (const amountCents of activeSubscriptions.values()) {
      mrr += amountCents;
    }

    return { mrr, subscribers: activeSubscriptions.size };
  },
});
