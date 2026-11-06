import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, cookieName, encrypt, stateMatches, type Provider } from "@/lib/oauth";

const providers = ["github", "supabase", "vercel"] as const;
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params; const provider = raw as Provider; const error = request.nextUrl.searchParams.get("error"), code = request.nextUrl.searchParams.get("code");
  if (!providers.includes(provider) || error || !code || !stateMatches(request.nextUrl.searchParams.get("state") || undefined, request.cookies.get(`__Host-oauth-state-${provider}`)?.value)) return NextResponse.redirect(new URL("/?oauth=failed", request.url));
  const verifier = request.cookies.get(`__Host-oauth-verifier-${provider}`)?.value; if (!verifier) return NextResponse.redirect(new URL("/?oauth=failed", request.url));
  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`]!, clientSecret = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`]!;
  const tokenUrl = provider === "github" ? "https://github.com/login/oauth/access_token" : provider === "supabase" ? "https://api.supabase.com/v1/oauth/token" : "https://api.vercel.com/login/oauth/token";
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(provider), code_verifier: verifier, client_id: clientId, client_secret: clientSecret });
  const tokenResponse = await fetch(tokenUrl, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` }, body });
  const token = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!tokenResponse.ok || !token?.access_token) return NextResponse.redirect(new URL("/?oauth=failed", request.url));
  const response = NextResponse.redirect(new URL(`/?oauth=${provider}`, request.url));
  response.cookies.set(cookieName(provider), encrypt({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.delete(`__Host-oauth-state-${provider}`); response.cookies.delete(`__Host-oauth-verifier-${provider}`); return response;
}
