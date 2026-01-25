import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Vercel OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=" + encodeURIComponent(error), process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=missing_params", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("vercel_oauth_state")?.value;
  const codeVerifier = cookieStore.get("vercel_oauth_verifier")?.value;

  // Clear cookies
  cookieStore.delete("vercel_oauth_state");
  cookieStore.delete("vercel_oauth_verifier");

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=invalid_state", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=missing_verifier", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  const clientSecret = process.env.VERCEL_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=not_configured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/vercel/callback`;

  // Exchange code for tokens
  const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Vercel token exchange failed:", errorText);
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=token_exchange_failed", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const tokens = await tokenResponse.json();

  // Store tokens in Convex
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=convex_not_configured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    return NextResponse.redirect(
      new URL("/dashboard?vercel=error&reason=auth_failed", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(convexToken);

  await client.mutation(api.connections.upsert, {
    service: "vercel",
    accessToken: tokens.access_token,
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    ...(tokens.expires_in ? { expiresAt: Date.now() + tokens.expires_in * 1000 } : {}),
    ...(tokens.scope ? { scope: tokens.scope } : {}),
  });

  return NextResponse.redirect(
    new URL("/dashboard?vercel=connected", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
}
