import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

export type Provider = "github" | "supabase" | "vercel";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dhanushworks-installer.vercel.app";
const key = process.env.INSTALLER_TOKEN_ENCRYPTION_KEY;

function requireKey(): Buffer {
  if (!key) throw new Error("Installer encryption is not configured.");
  const decoded = Buffer.from(key, "base64url");
  if (decoded.length !== 32) throw new Error("Installer encryption key must be a 32-byte base64url value.");
  return decoded;
}

export function callbackUrl(provider: Provider) { return `${baseUrl}/api/oauth/${provider}/callback`; }
// Vercel has two different OAuth products. "Sign in with Vercel" only grants
// identity permissions, while an Integration can be granted project and
// deployment scopes. The installer deliberately uses the latter whenever an
// integration slug is configured.
export function usesVercelIntegration() { return Boolean(process.env.VERCEL_INTEGRATION_SLUG); }
export function vercelApiUrl(path: string, teamId?: string) {
  const url = new URL(path, "https://api.vercel.com");
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}
export function configured(provider: Provider) {
  const prefix = provider.toUpperCase();
  return Boolean(process.env[`${prefix}_OAUTH_CLIENT_ID`] && process.env[`${prefix}_OAUTH_CLIENT_SECRET`]);
}
export function random() { return randomBytes(32).toString("base64url"); }
export function challenge(verifier: string) { return createHash("sha256").update(verifier).digest("base64url"); }
export function encrypt(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", requireKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}
export function decrypt<T>(value?: string): T | undefined {
  if (!value) return undefined;
  try { const raw = Buffer.from(value, "base64url"); const decipher = createDecipheriv("aes-256-gcm", requireKey(), raw.subarray(0, 12)); decipher.setAuthTag(raw.subarray(12, 28)); return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as T; } catch { return undefined; }
}
export function stateMatches(a?: string, b?: string) { return Boolean(a && b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))); }
export function cookieName(provider: Provider) { return `__Host-installer-${provider}`; }
