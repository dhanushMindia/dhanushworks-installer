import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookieName, decrypt, type Provider } from "@/lib/oauth";

export const runtime = "nodejs";
export const maxDuration = 300;

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "Dhanushworks-Installer",
});

const bearerHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "User-Agent": "Dhanushworks-Installer",
});

const json = <T>(response: Response) => response.json() as Promise<T>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const noStore = (body: unknown, init: ResponseInit = {}) =>
  NextResponse.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init.headers } });

async function providerError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object") {
    const record = payload as { message?: unknown; error?: { message?: unknown } };
    if (typeof record.message === "string") return record.message;
    if (typeof record.error?.message === "string") return record.error.message;
  }
  return response.statusText;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function validRepositoryName(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value);
}

function extractServiceKey(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.secret === "string") return record.secret;
    if (typeof record.service_role === "string") return record.service_role;
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        const key = value.find((item) => {
          if (!item || typeof item !== "object") return false;
          const entry = item as Record<string, unknown>;
          return entry.name === "service_role" || entry.name === "secret" || entry.type === "secret";
        }) as Record<string, unknown> | undefined;
        if (key) {
          for (const candidate of [key.api_key, key.key, key.value]) {
            if (typeof candidate === "string") return candidate;
          }
        }
      }
    }
  }
  return undefined;
}

async function verifyProviders(githubToken: string, supabaseToken: string, vercelToken: string) {
  const [githubResponse, supabaseResponse, vercelResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers: githubHeaders(githubToken) }),
    fetch("https://api.supabase.com/v1/organizations", { headers: bearerHeaders(supabaseToken) }),
    fetch("https://api.vercel.com/v2/user", { headers: bearerHeaders(vercelToken) }),
  ]);

  if (!githubResponse.ok) throw new Error("GitHub token verification failed.");
  if (!supabaseResponse.ok) throw new Error("Supabase Management token verification failed.");
  if (!vercelResponse.ok) throw new Error("Vercel token verification failed.");

  const [github, organizations, vercel] = await Promise.all([
    json<{ login: string }>(githubResponse),
    json<Array<{ slug?: string; id?: string }>>(supabaseResponse),
    json<unknown>(vercelResponse),
  ]);

  return { github, organizations, vercel };
}

async function waitForSupabaseProject(ref: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/health`, {
      headers: bearerHeaders(token),
    });
    if (response.ok) {
      const health = await json<Record<string, unknown>>(response);
      const services = Array.isArray(health.services) ? health.services as Array<Record<string, unknown>> : [];
      if (!services.length || services.every((service) => service.status === "ACTIVE_HEALTHY")) return;
    }
    await wait(3000);
  }
  throw new Error("Supabase project is still initializing. Wait a few minutes, then retry provisioning with the same project name.");
}

type OAuthToken = { accessToken: string; refreshToken?: string; expiresAt?: number };
function oauthToken(request: NextRequest, provider: Provider): string | undefined {
  return decrypt<OAuthToken>(request.cookies.get(cookieName(provider))?.value)?.accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const githubToken = requireString(body.githubToken || oauthToken(request, "github"), "GitHub authorization");
    const supabaseToken = requireString(body.supabaseToken || oauthToken(request, "supabase"), "Supabase authorization");
    const vercelToken = requireString(body.vercelToken || oauthToken(request, "vercel"), "Vercel authorization");
    const githubRepoName = requireString(body.githubRepoName, "GitHub repository name");
    const name = requireString(body.name, "Researcher name");
    const title = requireString(body.title, "Professional title");
    const researchFocus = requireString(body.researchFocus, "Research focus");
    const email = requireString(body.email, "Admin email");
    const adminPassword = requireString(body.adminPassword, "Admin password");
    const dryRun = body.dryRun === true;

    if (!validRepositoryName(githubRepoName)) {
      return noStore({ success: false, error: "Repository names may contain only letters, numbers, periods, underscores, and hyphens." }, { status: 400 });
    }
    if (adminPassword.length < 12) {
      return noStore({ success: false, error: "Use an administrator password with at least 12 characters." }, { status: 400 });
    }

    const logs = ["Verifying GitHub, Supabase, and Vercel credentials in parallel..."];
    const { github, organizations } = await verifyProviders(githubToken, supabaseToken, vercelToken);
    const organizationSlug = typeof body.supabaseOrganizationSlug === "string" && body.supabaseOrganizationSlug.trim()
      ? body.supabaseOrganizationSlug.trim()
      : organizations[0]?.slug || organizations[0]?.id;
    if (!organizationSlug) throw new Error("No Supabase organization is available for this token.");

    const existingRepo = await fetch(`https://api.github.com/repos/${github.login}/${githubRepoName}`, {
      headers: githubHeaders(githubToken),
    });
    if (existingRepo.ok) {
      return noStore({ success: false, error: `Repository '${githubRepoName}' already exists for ${github.login}. Choose a different name.` }, { status: 409 });
    }
    if (existingRepo.status !== 404) throw new Error("GitHub could not check whether the requested repository name is available.");

    logs.push(`Verified provider access for GitHub account ${github.login}.`);
    logs.push(`Selected Supabase organization ${organizationSlug}.`);
    logs.push(`Confirmed '${githubRepoName}' is available on GitHub.`);

    if (dryRun) {
      logs.push("Dry run passed: credentials, Supabase organization, and repository availability were verified.");
      return noStore({ success: true, dryRun: true, logs });
    }

    const databasePassword = randomBytes(32).toString("base64url");
    const authSecret = randomBytes(32).toString("base64url");
    const projectName = `${githubRepoName}-db`.slice(0, 60);
    const regionGroup = ["americas", "emea", "apac"].includes(body.supabaseRegion) ? body.supabaseRegion : "apac";

    logs.push("Creating an independent Supabase project...");
    const supabaseProjectResponse = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: bearerHeaders(supabaseToken),
      body: JSON.stringify({
        name: projectName,
        organization_slug: organizationSlug,
        db_pass: databasePassword,
        region_selection: { type: "smartGroup", code: regionGroup },
      }),
    });
    if (!supabaseProjectResponse.ok) {
      throw new Error(`Supabase project creation failed: ${await providerError(supabaseProjectResponse)}`);
    }
    const supabaseProject = await json<{ ref: string }>(supabaseProjectResponse);
    if (!supabaseProject.ref) throw new Error("Supabase did not return a project reference.");
    logs.push("Supabase project created. Waiting for database services to become healthy...");
    await waitForSupabaseProject(supabaseProject.ref, supabaseToken);

    const apiKeysResponse = await fetch(`https://api.supabase.com/v1/projects/${supabaseProject.ref}/api-keys?reveal=true`, {
      headers: bearerHeaders(supabaseToken),
    });
    if (!apiKeysResponse.ok) throw new Error("Unable to retrieve a server-side Supabase API key for storage configuration.");
    const supabaseServiceKey = extractServiceKey(await json<unknown>(apiKeysResponse));
    if (!supabaseServiceKey) throw new Error("Supabase did not provide a server-side API key. The project was created, but deployment has not started.");

    const supabaseUrl = `https://${supabaseProject.ref}.supabase.co`;
    const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...bearerHeaders(supabaseServiceKey), apikey: supabaseServiceKey },
      body: JSON.stringify({ id: "portfolio-media", name: "portfolio-media", public: false }),
    });
    if (!bucketResponse.ok && bucketResponse.status !== 409) throw new Error("Supabase Storage bucket creation failed.");
    logs.push("Supabase database and private media bucket are ready.");

    logs.push("Generating the GitHub repository from the Dhanushworks template...");
    const generateResponse = await fetch("https://api.github.com/repos/dhanushMindia/dhanushworks-template/generate", {
      method: "POST",
      headers: githubHeaders(githubToken),
      body: JSON.stringify({
        owner: github.login,
        name: githubRepoName,
        description: `Research portfolio — ${researchFocus}`,
        include_all_branches: false,
        private: true,
      }),
    });
    if (!generateResponse.ok) {
      throw new Error(`GitHub template generation failed: ${await providerError(generateResponse)}`);
    }
    const repository = await json<{ html_url: string; id: number; default_branch?: string }>(generateResponse);
    logs.push("Repository generated successfully.");

    const databaseUrl = `postgresql://postgres:${encodeURIComponent(databasePassword)}@db.${supabaseProject.ref}.supabase.co:5432/postgres`;
    const deploymentUrl = `https://${githubRepoName}.vercel.app`;
    const environmentVariables = [
      ["DATABASE_URL", databaseUrl],
      ["DIRECT_URL", databaseUrl],
      ["NEXTAUTH_SECRET", authSecret],
      ["NEXTAUTH_URL", deploymentUrl],
      ["AUTH_TRUST_HOST", "true"],
      ["ADMIN_EMAIL", email],
      ["ADMIN_PASSWORD", adminPassword],
      ["PROFILE_NAME", name],
      ["PROFILE_TAGLINE", title],
      ["PROFILE_BIO", researchFocus],
      ["PROFILE_ROLE", title],
      ["PROFILE_FOCUS", researchFocus],
      ["SUPABASE_URL", supabaseUrl],
      ["SUPABASE_SERVICE_ROLE_KEY", supabaseServiceKey],
      ["SUPABASE_STORAGE_BUCKET", "portfolio-media"],
    ].map(([key, value]) => ({ key, value, type: "encrypted", target: ["production", "preview", "development"] }));

    logs.push("Creating the Vercel project with encrypted environment variables...");
    const vercelProjectResponse = await fetch("https://api.vercel.com/v11/projects", {
      method: "POST",
      headers: bearerHeaders(vercelToken),
      body: JSON.stringify({
        name: githubRepoName,
        framework: "nextjs",
        gitRepository: { type: "github", repo: `${github.login}/${githubRepoName}` },
        environmentVariables,
      }),
    });
    if (!vercelProjectResponse.ok) {
      throw new Error(`Vercel project creation failed: ${await providerError(vercelProjectResponse)}`);
    }
    const vercelProject = await json<{ id: string }>(vercelProjectResponse);

    logs.push("Triggering the first production deployment and database initialization...");
    const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: bearerHeaders(vercelToken),
      body: JSON.stringify({
        name: githubRepoName,
        project: vercelProject.id,
        target: "production",
        gitSource: { type: "github", repoId: String(repository.id), ref: repository.default_branch || "main" },
      }),
    });
    if (!deploymentResponse.ok) {
      throw new Error(`Vercel deployment could not be started: ${await providerError(deploymentResponse)}`);
    }
    const deployment = await json<{ url?: string }>(deploymentResponse);
    logs.push("Deployment has started. Vercel will run migrations and create the initial administrator before the site becomes ready.");

    return noStore({
      success: true,
      logs,
      deployUrl: deployment.url ? `https://${deployment.url}` : deploymentUrl,
      repoUrl: repository.html_url,
      supabaseProjectRef: supabaseProject.ref,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed.";
    return noStore({ success: false, error: message }, { status: 400 });
  }
}
