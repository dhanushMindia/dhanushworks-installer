import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, cookieName, encrypt, stateMatches, type Provider } from "@/lib/oauth";

const providers = ["github", "supabase", "vercel"] as const;
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params; const provider = raw as Provider; const error = request.nextUrl.searchParams.get("error"), code = request.nextUrl.searchParams.get("code");
  const fail = (reason: unknown) => {
    const safeReason = typeof reason === "string" ? reason : "Provider returned an unexpected authorization error.";
    return NextResponse.redirect(new URL(`/?oauth=failed&provider=${encodeURIComponent(provider)}&reason=${encodeURIComponent(safeReason.slice(0, 180))}`, request.url));
  };
  if (!providers.includes(provider)) return fail("Unknown OAuth provider.");
  if (error) return fail(request.nextUrl.searchParams.get("error_description") || error);
  if (!code) return fail("Authorization code was not returned by the provider.");
  if (!stateMatches(request.nextUrl.searchParams.get("state") || undefined, request.cookies.get(`__Host-oauth-state-${provider}`)?.value)) return fail("The authorization session expired or state validation failed. Start the connection again.");
  const verifier = request.cookies.get(`__Host-oauth-verifier-${provider}`)?.value; if (!verifier) return fail("The PKCE verifier was not found. Start the connection again.");
  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`]!, clientSecret = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`]!;
  const tokenUrl = provider === "github" ? "https://github.com/login/oauth/access_token" : provider === "supabase" ? "https://api.supabase.com/v1/oauth/token" : "https://api.vercel.com/v2/oauth/access_token";
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(provider), code_verifier: verifier });
  if (provider !== "supabase") { body.set("client_id", clientId); body.set("client_secret", clientSecret); }
  const headers: HeadersInit = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
  if (provider === "supabase") headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  const tokenResponse = await fetch(tokenUrl, { method: "POST", headers, body });
  const token = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: unknown; error_description?: unknown; message?: unknown } | null;
  const safeProviderError = (payload: typeof token) => {
    if (!payload) return undefined;
    for (const value of [payload.error_description, payload.message, payload.error]) {
      if (typeof value === "string") return value;
      if (value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string") return (value as { message: string }).message;
    }
    return undefined;
  };
  if (!tokenResponse.ok || !token?.access_token) return fail(safeProviderError(token) || `Token exchange failed (${tokenResponse.status}).`);
  const identityUrl = provider === "github" ? "https://api.github.com/user" : provider === "supabase" ? "https://api.supabase.com/v1/organizations" : "https://api.vercel.com/v2/user";
  const identity = await fetch(identityUrl, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json", "User-Agent": "Dhanushworks-Installer" } });
  if (!identity.ok) return fail(`Token exchange succeeded, but permission verification failed (${identity.status}). Re-authorize with the required permissions.`);
  const response = NextResponse.redirect(new URL(`/?oauth=${provider}`, request.url));
  response.cookies.set(cookieName(provider), encrypt({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.delete(`__Host-oauth-state-${provider}`); response.cookies.delete(`__Host-oauth-verifier-${provider}`); return response;
}
