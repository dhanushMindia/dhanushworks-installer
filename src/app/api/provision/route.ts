import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookieName, decrypt, encrypt, type Provider } from "@/lib/oauth";

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
const noStore = (body: unknown, init: ResponseInit = {}, resume?: unknown, oauthUpdates: Partial<Record<Provider, OAuthToken>> = {}) => {
  const response = NextResponse.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init.headers } });
  if (resume) response.cookies.set("__Host-installer-provision", encrypt(resume), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 6 });
  for (const [provider, token] of Object.entries(oauthUpdates) as Array<[Provider, OAuthToken]>) {
    response.cookies.set(cookieName(provider), encrypt(token), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
};

const clearResume = (response: NextResponse) => {
  response.cookies.set("__Host-installer-provision", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
};

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

function validTheme(value: unknown): value is "editorial" | "minimal" | "creative" | "academic" {
  return value === "editorial" || value === "minimal" || value === "creative" || value === "academic";
}

function extractServiceKey(payload: unknown): string | undefined {
  const visit = (value: unknown, isSecret = false): string | undefined => {
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item); if (found) return found; }
      return undefined;
    }
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const label = [record.name, record.type, record.role, record.kind].find((item): item is string => typeof item === "string") || "";
    const secret = isSecret || /^(secret|service_role)$/i.test(label);
    if (secret) {
      for (const candidate of [record.api_key, record.key, record.value]) {
        if (typeof candidate === "string" && candidate) return candidate;
      }
    }
    // The Management API has returned an array, a `{ secret: {...} }` object,
    // and a nested `keys` object across its key migrations. Traverse those
    // documented shapes without ever serializing a revealed key in a response.
    for (const [name, nested] of Object.entries(record)) {
      const found = visit(nested, secret || /^(secret|service_role)$/i.test(name));
      if (found) return found;
    }
    return undefined;
  };
  return visit(payload);
}

async function verifyProviders(githubToken: string, supabaseToken: string, vercelToken: string) {
  const [githubResponse, supabaseResponse, vercelResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers: githubHeaders(githubToken) }),
    fetch("https://api.supabase.com/v1/organizations", { headers: bearerHeaders(supabaseToken) }),
    // Read the resource type the installer will actually manage. `v2/user`
    // needs the optional Vercel `user` permission and can return 404 even for
    // a valid deploy-scoped OAuth token, so it is not a useful deploy check.
    fetch("https://api.vercel.com/v9/projects?limit=1", { headers: bearerHeaders(vercelToken) }),
  ]);

  if (!githubResponse.ok) throw new Error(`GitHub OAuth verification failed (${githubResponse.status}): ${await providerError(githubResponse)}`);
  if (!supabaseResponse.ok) throw new Error(`Supabase OAuth verification failed (${supabaseResponse.status}): ${await providerError(supabaseResponse)}`);
  if (!vercelResponse.ok) {
    const detail = await providerError(vercelResponse);
    const guidance = vercelResponse.status === 403
      ? " The Vercel OAuth app is connected but lacks Vercel API permissions. Enable its project, project-environment-variable, and deployment permissions, then reconnect Vercel."
      : vercelResponse.status === 401
        ? " Reconnect Vercel to renew its OAuth authorization."
        : "";
    throw new Error(`Vercel OAuth verification failed (${vercelResponse.status}): ${detail}.${guidance}`);
  }

  const [github, organizations, vercel] = await Promise.all([
    json<{ login: string }>(githubResponse),
    json<Array<{ slug?: string; id?: string }>>(supabaseResponse),
    json<unknown>(vercelResponse),
  ]);

  return { github, organizations, vercel };
}

async function waitForSupabaseProject(ref: string, token: string): Promise<boolean> {
  // Health is a useful signal, but OAuth scopes and transient Management API
  // responses can make it unavailable even when the project services are ready.
  // After a short bounded wait, let the concrete API-key and Storage calls below
  // determine readiness; their failures are resumable without duplicating work.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/health`, {
      headers: bearerHeaders(token),
    });
    if (response.ok) {
      const health = await json<Record<string, unknown>>(response);
      const services = Array.isArray(health.services) ? health.services as Array<Record<string, unknown>> : [];
      const projectStatus = typeof health.status === "string" ? health.status : "";
      const isHealthyStatus = projectStatus === "ACTIVE_HEALTHY";
      const requiredServices = services.filter((service) => ["db", "database", "storage", "api"].includes(String(service.name || service.service || "").toLowerCase()));
      const areRequiredServicesHealthy = requiredServices.length > 0 && requiredServices.every((service) => service.status === "ACTIVE_HEALTHY");
      if (isHealthyStatus || areRequiredServicesHealthy) return true;
    }
    await wait(3000);
  }
  return false;
}

async function getSupabaseSecretKey(ref: string, token: string): Promise<string | undefined> {
  const read = async () => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: bearerHeaders(token) });
    if (!response.ok) throw new Error(`Unable to retrieve Supabase API keys: ${await providerError(response)}`);
    return extractServiceKey(await json<unknown>(response));
  };
  const existing = await read();
  if (existing) return existing;
  const enable = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
    method: "POST",
    headers: bearerHeaders(token),
    body: JSON.stringify({ type: "secret", name: "default", secret_jwt_template: { role: "service_role" } }),
  });
  if (!enable.ok) throw new Error(`Unable to enable the Supabase secret API key: ${await providerError(enable)}`);
  return extractServiceKey(await json<unknown>(enable)) || read();
}

type OAuthToken = { accessToken: string; refreshToken?: string; expiresAt?: number };
type Repository = { htmlUrl: string; id: number; defaultBranch?: string };
type ResumeJob = {
  projectRef: string;
  databasePassword: string;
  projectName: string;
  repository?: Repository;
  vercelProjectId?: string;
};
async function oauthToken(
  request: NextRequest,
  provider: Provider,
  updates: Partial<Record<Provider, OAuthToken>>,
): Promise<string | undefined> {
  const current = decrypt<OAuthToken>(request.cookies.get(cookieName(provider))?.value);
  if (!current?.accessToken) return undefined;

  // Vercel access tokens are deliberately short-lived (one hour). Refresh a
  // little early so a long provisioning request cannot fail halfway through.
  if (!current.expiresAt || current.expiresAt > Date.now() + 60_000) return current.accessToken;
  if (!current.refreshToken) throw new Error(`${provider[0].toUpperCase()}${provider.slice(1)} OAuth authorization expired. Connect that account again.`);

  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`];
  if (!clientId || !clientSecret) throw new Error(`${provider[0].toUpperCase()}${provider.slice(1)} OAuth is not configured on this installer.`);

  const tokenUrl = provider === "github"
    ? "https://github.com/login/oauth/access_token"
    : provider === "supabase"
      ? "https://api.supabase.com/v1/oauth/token"
      : "https://api.vercel.com/login/oauth/token";
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: current.refreshToken });
  const headers: HeadersInit = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
  if (provider === "supabase") {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }
  const refreshedResponse = await fetch(tokenUrl, { method: "POST", headers, body });
  const refreshed = await refreshedResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!refreshedResponse.ok || !refreshed?.access_token) {
    throw new Error(`${provider[0].toUpperCase()}${provider.slice(1)} OAuth authorization expired. Connect that account again.`);
  }
  const next: OAuthToken = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || current.refreshToken,
    expiresAt: refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : undefined,
  };
  updates[provider] = next;
  return next.accessToken;
}

export async function POST(request: NextRequest) {
  let resumableJob: ResumeJob | undefined;
  const oauthUpdates: Partial<Record<Provider, OAuthToken>> = {};
  const respond = (body: unknown, init: ResponseInit = {}, resume?: unknown) => noStore(body, init, resume, oauthUpdates);
  try {
    const body = await request.json();
    const githubToken = requireString(await oauthToken(request, "github", oauthUpdates), "GitHub OAuth authorization");
    const supabaseToken = requireString(await oauthToken(request, "supabase", oauthUpdates), "Supabase OAuth authorization");
    const vercelToken = requireString(await oauthToken(request, "vercel", oauthUpdates), "Vercel OAuth authorization");
    const githubRepoName = requireString(body.githubRepoName, "GitHub repository name");
    const name = requireString(body.name, "Researcher name");
    const title = requireString(body.title, "Professional title");
    const researchFocus = requireString(body.researchFocus, "Research focus");
    const email = requireString(body.email, "Admin email");
    const adminPassword = requireString(body.adminPassword, "Admin password");
    const dryRun = body.dryRun === true;

    if (!validRepositoryName(githubRepoName)) {
      return respond({ success: false, error: "Repository names may contain only letters, numbers, periods, underscores, and hyphens." }, { status: 400 });
    }
    if (adminPassword.length < 12) {
      return respond({ success: false, error: "Use an administrator password with at least 12 characters." }, { status: 400 });
    }

    const logs = ["Verifying GitHub, Supabase, and Vercel credentials in parallel..."];
    const { github, organizations } = await verifyProviders(githubToken, supabaseToken, vercelToken);
    const organizationSlug = typeof body.supabaseOrganizationSlug === "string" && body.supabaseOrganizationSlug.trim()
      ? body.supabaseOrganizationSlug.trim()
      : organizations[0]?.slug || organizations[0]?.id;
    if (!organizationSlug) throw new Error("No Supabase organization is available for this token.");

    const savedJob = decrypt<ResumeJob>(request.cookies.get("__Host-installer-provision")?.value);
    const existingRepo = await fetch(`https://api.github.com/repos/${github.login}/${githubRepoName}`, {
      headers: githubHeaders(githubToken),
    });
    const resumeRepository = savedJob?.repository;
    if (existingRepo.ok && !(resumeRepository && savedJob?.projectName === `${githubRepoName}-db`.slice(0, 60))) {
      return respond({ success: false, error: `Repository '${githubRepoName}' already exists for ${github.login}. Choose a different name.` }, { status: 409 });
    }
    if (!existingRepo.ok && existingRepo.status !== 404) throw new Error("GitHub could not check whether the requested repository name is available.");

    logs.push(`Verified provider access for GitHub account ${github.login}.`);
    logs.push(`Selected Supabase organization ${organizationSlug}.`);
    logs.push(`Confirmed '${githubRepoName}' is available on GitHub.`);

    if (dryRun) {
      logs.push("Dry run passed: credentials, Supabase organization, and repository availability were verified.");
      return respond({ success: true, dryRun: true, logs });
    }

    const authSecret = randomBytes(32).toString("base64url");
    const projectName = `${githubRepoName}-db`.slice(0, 60);
    const regionGroup = ["americas", "emea", "apac"].includes(body.supabaseRegion) ? body.supabaseRegion : "apac";
    let supabaseProject: { ref: string };
    let databasePassword: string;
    if (savedJob?.projectName === projectName) {
      supabaseProject = { ref: savedJob.projectRef }; databasePassword = savedJob.databasePassword;
      logs.push(`Resuming the existing Supabase project ${projectName}.`);
    } else {
      const existingProjects = await fetch(`https://api.supabase.com/v1/projects?organization_slug=${encodeURIComponent(organizationSlug)}`, { headers: bearerHeaders(supabaseToken) });
      const projects = existingProjects.ok ? await json<Array<{ name?: string; ref?: string }>>(existingProjects) : [];
      if (projects.some((project) => project.name === projectName)) return respond({ success: false, code: "EXISTING_UNRECOVERABLE_PROJECT", error: `A Supabase project named '${projectName}' already exists from an earlier interrupted attempt. To prevent a duplicate, the installer will not create another. Delete that test project or contact support to resume it with its original database password.` }, { status: 409 });
      databasePassword = randomBytes(32).toString("base64url");
      logs.push("Creating an independent Supabase project...");
      const supabaseProjectResponse = await fetch("https://api.supabase.com/v1/projects", { method: "POST", headers: bearerHeaders(supabaseToken), body: JSON.stringify({ name: projectName, organization_slug: organizationSlug, db_pass: databasePassword, region_selection: { type: "smartGroup", code: regionGroup } }) });
      if (!supabaseProjectResponse.ok) {
        const message = await providerError(supabaseProjectResponse);
        if (/maximum limits for the number of active free projects/i.test(message)) return respond({ success: false, code: "SUPABASE_FREE_PROJECT_LIMIT", error: "Supabase cannot create another free project for this organization because its active free-project limit has been reached. No GitHub repository or Vercel project was created. Pause, delete, or upgrade an existing Supabase project, then start a fresh installation." }, { status: 409 });
        throw new Error(`Supabase project creation failed: ${message}`);
      }
      supabaseProject = await json<{ ref: string }>(supabaseProjectResponse);
      if (!supabaseProject.ref) throw new Error("Supabase did not return a project reference.");
    }
    resumableJob = { ...savedJob, projectRef: supabaseProject.ref, databasePassword, projectName };
    logs.push("Supabase project created. Checking database service readiness...");
    const healthConfirmed = await waitForSupabaseProject(supabaseProject.ref, supabaseToken);
    // The dashboard can report a healthy project while the health endpoint
    // omits the service names this endpoint has used in other API versions.
    // Treat it as a useful progress signal only; the secret-key and Storage
    // calls below are the authoritative readiness checks for this workflow.
    if (!healthConfirmed) logs.push("Supabase health details are still incomplete; validating readiness with its API-key and Storage services instead.");

    const supabaseServiceKey = await getSupabaseSecretKey(supabaseProject.ref, supabaseToken);
    if (!supabaseServiceKey) throw new Error("Supabase did not provide a server-side API key. The project was created, but deployment has not started.");

    const supabaseUrl = `https://${supabaseProject.ref}.supabase.co`;
    const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...bearerHeaders(supabaseServiceKey), apikey: supabaseServiceKey },
      body: JSON.stringify({ id: "portfolio-media", name: "portfolio-media", public: false }),
    });
    if (!bucketResponse.ok && bucketResponse.status !== 409) {
      const message = await providerError(bucketResponse);
      // Storage returns either 409 or a 400 "resource already exists" while
      // its services settle. Both mean this idempotent setup step is complete.
      if (!/resource already exists/i.test(message)) {
        throw new Error(`Supabase Storage bucket creation failed (${bucketResponse.status}): ${message}`);
      }
    }
    logs.push("Supabase database and private media bucket are ready.");

    let repository: Repository;
    if (resumeRepository) {
      repository = resumeRepository;
      logs.push("Reusing the repository created by the earlier attempt.");
    } else {
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
        const message = await providerError(generateResponse);
        // GitHub OAuth integrations can have repository-creation permission
        // while the template endpoint itself is unavailable to the integration.
        // Fall back to GitHub's first-party import flow: it creates the same
        // repository from the public template without exposing any credential.
        if (!/resource not accessible by integration/i.test(message)) {
          throw new Error(`GitHub template generation failed: ${message}`);
        }
        const createResponse = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: githubHeaders(githubToken),
          body: JSON.stringify({ name: githubRepoName, description: `Research portfolio — ${researchFocus}`, private: true, auto_init: false }),
        });
        if (!createResponse.ok) {
          const createMessage = await providerError(createResponse);
          if (/resource not accessible by integration/i.test(createMessage)) {
            throw new Error("GitHub OAuth is connected but this GitHub app was not granted repository creation/write access. Reconnect GitHub and approve repository access for the installer, then resume this saved installation.");
          }
          throw new Error(`GitHub repository creation failed: ${createMessage}`);
        }
        const created = await json<{ html_url: string; id: number; default_branch?: string }>(createResponse);
        repository = { htmlUrl: created.html_url, id: created.id, defaultBranch: created.default_branch || "main" };
        resumableJob = { ...resumableJob, repository };
        const importResponse = await fetch(`https://api.github.com/repos/${github.login}/${githubRepoName}/import`, {
          method: "PUT",
          headers: githubHeaders(githubToken),
          body: JSON.stringify({ vcs_url: "https://github.com/dhanushMindia/dhanushworks-template.git" }),
        });
        if (!importResponse.ok) throw new Error(`GitHub template import could not be started: ${await providerError(importResponse)}`);
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await wait(3000);
          const statusResponse = await fetch(`https://api.github.com/repos/${github.login}/${githubRepoName}/import`, { headers: githubHeaders(githubToken) });
          if (!statusResponse.ok) throw new Error(`GitHub template import status failed: ${await providerError(statusResponse)}`);
          const status = await json<{ status?: string; status_text?: string }>(statusResponse);
          if (status.status === "complete") break;
          if (status.status === "error" || status.status === "failed") throw new Error(`GitHub template import failed: ${status.status_text || "unknown error"}`);
          if (attempt === 19) throw new Error("GitHub template import is still running. The installer will safely resume it shortly.");
        }
        logs.push("Repository created and populated from the template through GitHub import.");
      } else {
        const generated = await json<{ html_url: string; id: number; default_branch?: string }>(generateResponse);
        repository = { htmlUrl: generated.html_url, id: generated.id, defaultBranch: generated.default_branch };
        resumableJob = { ...resumableJob, repository };
        logs.push("Repository generated successfully.");
      }
    }

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
      ["PROFILE_THEME", validTheme(body.theme) ? body.theme : "editorial"],
      ["SUPABASE_URL", supabaseUrl],
      ["SUPABASE_SERVICE_ROLE_KEY", supabaseServiceKey],
      ["SUPABASE_STORAGE_BUCKET", "portfolio-media"],
    ].map(([key, value]) => ({ key, value, type: "encrypted", target: ["production", "preview", "development"] }));

    let vercelProjectId = resumableJob.vercelProjectId;
    if (vercelProjectId) {
      logs.push("Reusing the Vercel project created by the earlier attempt.");
    } else {
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
      vercelProjectId = (await json<{ id: string }>(vercelProjectResponse)).id;
      resumableJob = { ...resumableJob, vercelProjectId };
    }

    logs.push("Triggering the first production deployment and database initialization...");
    const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: bearerHeaders(vercelToken),
      body: JSON.stringify({
        name: githubRepoName,
        project: vercelProjectId,
        target: "production",
        gitSource: { type: "github", repoId: String(repository.id), ref: repository.defaultBranch || "main" },
      }),
    });
    if (!deploymentResponse.ok) {
      throw new Error(`Vercel deployment could not be started: ${await providerError(deploymentResponse)}`);
    }
    const deployment = await json<{ url?: string }>(deploymentResponse);
    logs.push("Deployment has started. Vercel will run migrations and create the initial administrator before the site becomes ready.");

    return clearResume(respond({
      success: true,
      logs,
      deployUrl: deployment.url ? `https://${deployment.url}` : deploymentUrl,
      repoUrl: repository.htmlUrl,
      supabaseProjectRef: supabaseProject.ref,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed.";
    return respond({ success: false, error: message, resumable: Boolean(resumableJob) }, { status: 400 }, resumableJob);
  }
}
