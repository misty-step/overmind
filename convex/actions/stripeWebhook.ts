"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Verify Stripe webhook signature and parse the event.
 * Returns the parsed event if valid, error details if invalid.
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
