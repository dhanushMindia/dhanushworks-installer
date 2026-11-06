import { NextRequest, NextResponse } from "next/server";
import { cookieName, decrypt, type Provider } from "@/lib/oauth";

type OAuthToken = { accessToken: string };
const providers: Provider[] = ["github", "supabase", "vercel"];
export async function GET(request: NextRequest) {
  const status = Object.fromEntries(providers.map((provider) => [provider, Boolean(decrypt<OAuthToken>(request.cookies.get(cookieName(provider))?.value)?.accessToken)]));
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
