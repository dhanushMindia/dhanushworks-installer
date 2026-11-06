import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, challenge, configured, random, type Provider } from "@/lib/oauth";

const providers = ["github", "supabase", "vercel"] as const;
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params; if (!providers.includes(raw as Provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const provider = raw as Provider; if (!configured(provider)) return NextResponse.json({ error: `${provider} OAuth is not configured.` }, { status: 503 });
  const state = random(), verifier = random(), redirect = new URL(callbackUrl(provider));
  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`]!;
  const authorize = provider === "github" ? new URL("https://github.com/login/oauth/authorize") : provider === "supabase" ? new URL("https://api.supabase.com/v1/oauth/authorize") : new URL("https://vercel.com/oauth/authorize");
  authorize.searchParams.set("client_id", clientId); authorize.searchParams.set("redirect_uri", redirect.toString()); authorize.searchParams.set("response_type", "code"); authorize.searchParams.set("state", state); authorize.searchParams.set("code_challenge", challenge(verifier)); authorize.searchParams.set("code_challenge_method", "S256");
  if (provider === "github") authorize.searchParams.set("scope", "repo offline_access");
  if (provider === "vercel") authorize.searchParams.set("scope", "openid email profile offline_access");
  const response = NextResponse.redirect(authorize);
  const options = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set(`__Host-oauth-state-${provider}`, state, options); response.cookies.set(`__Host-oauth-verifier-${provider}`, verifier, options); return response;
}
