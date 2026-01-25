import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Vercel Drain endpoint for analytics events
http.route({
  path: "/drain/analytics",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const events = Array.isArray(body) ? body : [body];

      let processed = 0;
      for (const event of events) {
        // Only process pageview events for now
        if (event.eventType !== "pageview") continue;
        if (!event.projectId || !event.sessionId || !event.deviceId) continue;

        await ctx.runMutation(internal.analytics.ingestEvent, {
          vercelProjectId: event.projectId,
          eventType: event.eventType,
          eventName: event.eventName,
          sessionId: event.sessionId,
          deviceId: event.deviceId,
          path: event.path ?? "/",
          referrer: event.referrer,
          country: event.country,
          deviceType: event.deviceType,
          timestamp: event.timestamp ?? Date.now(),
        });
        processed++;
      }

      return new Response(JSON.stringify({ ok: true, processed }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[drain] Error processing analytics:", error);
      return new Response(
        JSON.stringify({ ok: false, error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Stripe webhook endpoint
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const signature = request.headers.get("stripe-signature");
      const rawBody = await request.text();

      // TODO: Verify Stripe signature with webhook secret
      void signature;

      const event = JSON.parse(rawBody);
      const dataObject = event?.data?.object;
      const eventType = event?.type as string | undefined;

      const eventTypeMap: Record<string, string> = {
        "invoice.paid": "payment",
        "customer.subscription.created": "subscription_created",
        "customer.subscription.deleted": "subscription_deleted",
      };

      const mappedType = eventType ? eventTypeMap[eventType] : undefined;
      if (!mappedType) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isInvoicePaid = eventType === "invoice.paid";
      const stripeProductId = isInvoicePaid
        ? dataObject?.lines?.data?.[0]?.price?.product
        : dataObject?.items?.data?.[0]?.price?.product;

      if (!stripeProductId) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const subscriptionId =
        dataObject?.subscription ??
        (eventType?.startsWith("customer.subscription.") ? dataObject?.id : undefined);

      const amountCents = isInvoicePaid
        ? dataObject?.amount_paid ?? 0
        : dataObject?.items?.data?.[0]?.price?.unit_amount ?? 0;

      const customerId = dataObject?.customer;
      const currency = dataObject?.currency ?? "usd";

      if (!customerId) {
        console.warn("[stripe] Missing customerId in event:", event.id);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runMutation(internal.stripe.ingestEvent, {
        stripeProductId,
        stripeEventId: event.id,
        eventType: mappedType,
        customerId,
        subscriptionId,
        amountCents,
        currency,
        timestamp: (event?.created ?? 0) * 1000,
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[stripe] Error processing webhook:", error);
      return new Response(
        JSON.stringify({ ok: false, error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
