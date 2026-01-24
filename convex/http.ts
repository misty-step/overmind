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

export default http;
