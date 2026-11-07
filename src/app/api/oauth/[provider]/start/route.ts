import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, challenge, configured, encrypt, random, type Provider, usesVercelIntegration } from "@/lib/oauth";

const providers = ["github", "supabase", "vercel"] as const;
async function begin(request: NextRequest, provider: Provider, draft?: unknown) {
  if (draft) {
    // The encrypted, HttpOnly cookie is scoped to this onboarding browser only.
    // It allows a callback to restore the wizard without exposing provider credentials.
  }
  if (!configured(provider)) return NextResponse.json({ error: `${provider} OAuth is not configured.` }, { status: 503 });
  const state = random(), verifier = random(), redirect = new URL(callbackUrl(provider));
  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`]!;
  const integration = provider === "vercel" && usesVercelIntegration();
  const authorize = provider === "github"
    ? new URL("https://github.com/login/oauth/authorize")
    : provider === "supabase"
      ? new URL("https://api.supabase.com/v1/oauth/authorize")
      : new URL("https://vercel.com/oauth/authorize");
  // An Integration receives a project-scoped authorization code from the same
  // authorization endpoint. Its private marketplace URL intentionally returns
  // 404, so it must never be used as the OAuth entry point.
  {
    authorize.searchParams.set("client_id", clientId); authorize.searchParams.set("redirect_uri", redirect.toString()); authorize.searchParams.set("response_type", "code"); authorize.searchParams.set("state", state); authorize.searchParams.set("code_challenge", challenge(verifier)); authorize.searchParams.set("code_challenge_method", "S256");
  }
  if (provider === "github") authorize.searchParams.set("scope", "repo");
  if (provider === "vercel" && !integration) authorize.searchParams.set("scope", "openid email profile offline_access");
  const response = NextResponse.json({ url: authorize.toString() });
  const options = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set(`__Host-oauth-state-${provider}`, state, options); response.cookies.set(`__Host-oauth-verifier-${provider}`, verifier, options);
  if (draft) response.cookies.set("__Host-installer-draft", encrypt(draft), { ...options, maxAge: 3600 });
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params; if (!providers.includes(raw as Provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const response = await begin(request, raw as Provider); if (!response.ok) return response;
  const redirect = NextResponse.redirect((await response.json()).url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params; if (!providers.includes(raw as Provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const { draft } = await request.json().catch(() => ({})); return begin(request, raw as Provider, draft);
}
