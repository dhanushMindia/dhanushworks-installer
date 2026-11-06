import { NextRequest, NextResponse } from "next/server";
import { cookieName, decrypt, type Provider } from "@/lib/oauth";

type OAuthToken = { accessToken: string };
const providers: Provider[] = ["github", "supabase", "vercel"];
export async function GET(request: NextRequest) {
  const status = Object.fromEntries(providers.map((provider) => [provider, Boolean(decrypt<OAuthToken>(request.cookies.get(cookieName(provider))?.value)?.accessToken)]));
  const draft = decrypt<Record<string, unknown>>(request.cookies.get("__Host-installer-draft")?.value);
  return NextResponse.json({ ...status, draft }, { headers: { "Cache-Control": "no-store" } });
}
