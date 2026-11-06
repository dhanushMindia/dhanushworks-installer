"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Terminal,
  Settings,
  Key,
} from "lucide-react";

export default function InstallerWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    researchFocus: "",
    email: "",
    adminPassword: "",
    githubRepoName: "",
    supabaseOrganizationSlug: "",
    supabaseRegion: "apac",
    githubToken: "",
    supabaseToken: "",
    vercelToken: "",
  });

  const [providerStatus, setProviderStatus] = useState({
    github: "NOT_CONFIGURED",
    supabase: "NOT_CONFIGURED",
    vercel: "NOT_CONFIGURED",
  });

  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionLogs, setProvisionLogs] = useState<string[]>([]);
  const [deployResult, setDeployResult] = useState<{ deployUrl?: string; repoUrl?: string } | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oauth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((connected) => { if (connected.draft) { const { step: savedStep, ...draft } = connected.draft; setFormData((previous) => ({ ...previous, ...draft })); if (Number.isInteger(savedStep)) setStep(savedStep); } setProviderStatus((previous) => ({ ...previous, github: connected.github ? "AUTHORIZED" : previous.github, supabase: connected.supabase ? "AUTHORIZED" : previous.supabase, vercel: connected.vercel ? "AUTHORIZED" : previous.vercel })); })
      .catch(() => undefined);
    const query = new URLSearchParams(window.location.search);
    const oauth = query.get("oauth");
    if (oauth === "failed") setErrorDetails(`${query.get("provider") || "Provider"} OAuth failed: ${query.get("reason") || "Check the callback URL and OAuth app settings, then try again."}`);
    if (["github", "supabase", "vercel"].includes(oauth || "")) setOauthNotice(`${oauth![0].toUpperCase()}${oauth!.slice(1)} connected. Your draft was restored.`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...formData, [e.target.name]: e.target.value };
    setFormData(next);
  };

  const preserveDraftForOAuth = async (provider: "github" | "supabase" | "vercel") => {
    const { githubToken, supabaseToken, vercelToken, ...draft } = formData;
    const response = await fetch(`/api/oauth/${provider}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: { ...draft, step } }) });
    const data = await response.json(); if (!response.ok) { setErrorDetails(data.error || "Could not begin provider authorization."); return; }
    window.location.assign(data.url);
  };

  const verifyProvider = async (provider: "github" | "supabase" | "vercel") => {
    setIsVerifying(true);
    setErrorDetails(null);

    const tokenKey = `${provider}Token` as keyof typeof formData;
    const token = formData[tokenKey];

    if (!token) {
      setErrorDetails(`Please enter a valid ${provider.toUpperCase()} token before verifying.`);
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, token }),
      });
      const data = await res.json();

      if (data.verified) {
        setProviderStatus((prev) => ({ ...prev, [provider]: "AUTHORIZED" }));
      } else {
        setProviderStatus((prev) => ({ ...prev, [provider]: "FAILED" }));
        setErrorDetails(data.error || `Failed to verify ${provider} credentials.`);
      }
    } catch (err) {
      setProviderStatus((prev) => ({ ...prev, [provider]: "FAILED" }));
      setErrorDetails(`Network error verifying ${provider}.`);
    } finally {
      setIsVerifying(false);
    }
  };

  const executeProvisioning = async (dryRun = false, resumeAttempt = 0) => {
    setIsProvisioning(true);
    if (resumeAttempt === 0) {
      setProvisionLogs([dryRun ? "Initiating dry-run validation (no external mutations)..." : "Initiating live provisioning sequence..."]);
    } else {
      setProvisionLogs((previous) => [...previous, `Continuing the recorded installation automatically (attempt ${resumeAttempt + 1})...`]);
    }
    setErrorDetails(null);

    try {
      const res = await fetch("/api/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, dryRun }),
      });
      const data = await res.json();

      if (data.success) {
        setProvisionLogs(data.logs || ["Provisioning completed successfully."]);
        setDeployResult({ deployUrl: data.deployUrl, repoUrl: data.repoUrl });
        if (!dryRun) {
          setStep(5); // Success step for live provision
        } else {
          setProvisionLogs((prev) => [...prev, "[DRY RUN] Dry run passed successfully. No resources were modified."]);
        }
      } else {
        setProvisionLogs((prev) => [...prev, `ERROR: ${data.error}`]);
        setErrorDetails(data.error);
        // A cloud database can report a transient readiness state while it is
        // already being created. The server has recorded its reference in an
        // encrypted, HttpOnly cookie, so continue it without making the
        // researcher press the button again or creating a second project.
        if (!dryRun && data.resumable && resumeAttempt < 3) {
          setProvisionLogs((prev) => [...prev, "The database is still settling. Continuing automatically in 10 seconds — do not start a second installation."]);
          window.setTimeout(() => void executeProvisioning(false, resumeAttempt + 1), 10_000);
        }
      }
    } catch (err: any) {
      setErrorDetails(err.message || "Provisioning request failed.");
    } finally {
      setIsProvisioning(false);
    }
  };

  const allAuthorized =
    providerStatus.github === "AUTHORIZED" &&
    providerStatus.vercel === "AUTHORIZED" &&
    providerStatus.supabase === "AUTHORIZED";

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col justify-between font-sans selection:bg-stone-200">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-100 border border-stone-200 rounded-md text-stone-800 font-mono text-xs font-bold">
            SETUP
          </div>
          <div>
            <h1 className="font-medium text-base tracking-tight text-stone-900">
              Research Portfolio & CSPR Platform Installer
            </h1>
            <p className="text-xs text-stone-500">Live API Provisioning & Deployment Wizard</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-stone-600">
          <span>v2.0 Production</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
        {/* Step Navigation Bar */}
        <div className="mb-10">
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs font-mono text-stone-500 uppercase tracking-wider">
            <span className={step >= 1 ? "text-stone-900 font-semibold" : ""}>1. Profile</span>
            <span className={step >= 2 ? "text-stone-900 font-semibold" : ""}>2. Tokens</span>
            <span className={step >= 3 ? "text-stone-900 font-semibold" : ""}>3. Verify</span>
            <span className={step >= 4 ? "text-stone-900 font-semibold" : ""}>4. Deploy</span>
          </div>
          <div className="h-1 w-full bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-900 transition-all duration-300"
              style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Profile & Free-form Research Focus */}
        {step === 1 && (
          <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-stone-900">Researcher & Repository Configuration</h2>
              <p className="text-stone-600 mt-2 text-sm">
                Enter your researcher metadata and custom research focus. This will populate your portfolio schema and repository details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Dr. Firstname Lastname"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Professional Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Research Fellow, CSPR"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Research Focus / Domain (Free-form)</label>
                <input
                  type="text"
                  name="researchFocus"
                  value={formData.researchFocus}
                  onChange={handleInputChange}
                  autoComplete="email"
                  placeholder="e.g. Algorithmic Market Design & Monetary Policy"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Admin Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Admin Password</label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  minLength={12}
                  placeholder="At least 12 characters"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">GitHub Repository Name</label>
                <input
                  type="text"
                  name="githubRepoName"
                  value={formData.githubRepoName}
                  onChange={handleInputChange}
                  placeholder="cspr-research-portfolio"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Supabase Organization Slug <span className="normal-case text-stone-400">(optional)</span></label>
                <input
                  type="text"
                  name="supabaseOrganizationSlug"
                  value={formData.supabaseOrganizationSlug}
                  onChange={handleInputChange}
                  placeholder="Leave blank to use your first available organization"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">Database region</label>
                <select name="supabaseRegion" value={formData.supabaseRegion} onChange={handleInputChange} className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-stone-900">
                  <option value="apac">Asia Pacific</option>
                  <option value="emea">Europe, Middle East & Africa</option>
                  <option value="americas">Americas</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-stone-100">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Continue to Tokens <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: API Tokens */}
        {step === 2 && (
          <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-stone-900">Cloud Provider API Tokens</h2>
              <p className="text-stone-600 mt-2 text-sm">
                Connect each provider securely with OAuth. Personal access tokens remain available only as a controlled recovery path.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["github", "supabase", "vercel"] as const).map((provider) => (
                <button key={provider} onClick={() => preserveDraftForOAuth(provider)} className={`rounded-lg border px-3 py-2 text-center text-xs font-medium ${providerStatus[provider] === "AUTHORIZED" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-300 text-stone-800 hover:bg-stone-100"}`}>
                  {providerStatus[provider] === "AUTHORIZED" ? `${provider[0].toUpperCase() + provider.slice(1)} connected ✓` : `Connect ${provider[0].toUpperCase() + provider.slice(1)} with OAuth`}
                </button>
              ))}
            </div>

            {oauthNotice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{oauthNotice}</div>}
            {errorDetails && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{errorDetails}</div>}

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">
                  GitHub Personal Access Token (PAT with <span className="text-stone-900 font-semibold">repo</span> scope)
                </label>
                <input
                  type="password"
                  name="githubToken"
                  value={formData.githubToken}
                  onChange={handleInputChange}
                  autoComplete="off"
                  placeholder="ghp_..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">
                  Vercel API Token (<span className="text-stone-900 font-semibold">Account Settings &gt; Tokens</span>)
                </label>
                <input
                  type="password"
                  name="vercelToken"
                  value={formData.vercelToken}
                  onChange={handleInputChange}
                  autoComplete="off"
                  placeholder="vercel_token_..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-600 uppercase tracking-wider mb-1.5">
                  Supabase Management Token (<span className="text-stone-900 font-semibold text-red-600">Mandatory</span>)
                </label>
                <input
                  type="password"
                  name="supabaseToken"
                  value={formData.supabaseToken}
                  onChange={handleInputChange}
                  autoComplete="off"
                  placeholder="sbp_..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm font-mono focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Verify Credentials <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-stone-900">Credential Verification</h2>
              <p className="text-stone-600 mt-2 text-sm">
                Test your API tokens against real provider endpoints before initiating deployment. All three tokens are mandatory.
              </p>
            </div>

            {errorDetails && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>{errorDetails}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-stone-900 text-sm">GitHub API</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">Tests template generation scope</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                    providerStatus.github === "AUTHORIZED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                  }`}>
                    {providerStatus.github}
                  </span>
                  <button
                    onClick={() => verifyProvider("github")}
                    disabled={isVerifying}
                    className="px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded hover:bg-stone-800 transition-colors"
                  >
                    Verify GitHub
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-stone-900 text-sm">Supabase API</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">Tests management API token</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                    providerStatus.supabase === "AUTHORIZED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                  }`}>
                    {providerStatus.supabase}
                  </span>
                  <button
                    onClick={() => verifyProvider("supabase")}
                    disabled={isVerifying}
                    className="px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded hover:bg-stone-800 transition-colors"
                  >
                    Verify Supabase
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-stone-900 text-sm">Vercel API</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">Tests project creation & deploy scope</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                    providerStatus.vercel === "AUTHORIZED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                  }`}>
                    {providerStatus.vercel}
                  </span>
                  <button
                    onClick={() => verifyProvider("vercel")}
                    disabled={isVerifying}
                    className="px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded hover:bg-stone-800 transition-colors"
                  >
                    Verify Vercel
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={!allAuthorized}
                onClick={() => setStep(4)}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  allAuthorized
                    ? "bg-stone-900 hover:bg-stone-800 text-white"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                }`}
              >
                Proceed to Deploy <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Live Execution & Dry Run */}
        {step === 4 && (
          <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-stone-900">Execute Provisioning & Validation</h2>
              <p className="text-stone-600 mt-2 text-sm">
                A live run creates an independent database and private media bucket, then starts the first portfolio deployment. Run the no-change validation first.
              </p>
            </div>

            {errorDetails && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>{errorDetails}</span>
              </div>
            )}

            <div className="p-5 rounded-lg bg-stone-50 border border-stone-200 space-y-2 font-mono text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Repository Name:</span>
                <span className="text-stone-900 font-semibold">{formData.githubRepoName}</span>
              </div>
              <div className="flex justify-between">
                <span>Research Focus:</span>
                <span className="text-stone-900 font-semibold">{formData.researchFocus}</span>
              </div>
              <div className="flex justify-between">
                <span>Researcher:</span>
                <span className="text-stone-900 font-semibold">{formData.name}</span>
              </div>
            </div>

            {provisionLogs.length > 0 && (
              <div className="p-4 rounded-lg bg-stone-950 text-stone-200 font-mono text-xs space-y-1.5 max-h-60 overflow-y-auto">
                {provisionLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-stone-500">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                disabled={isProvisioning}
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex gap-3">
                <button
                  disabled={isProvisioning}
                  onClick={() => executeProvisioning(true)}
                  className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isProvisioning ? "Running..." : "Test Dry-Run (No Mutations)"}
                </button>
                <button
                  disabled={isProvisioning}
                  onClick={() => executeProvisioning(false)}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isProvisioning ? "Provisioning..." : "Execute Live Provisioning"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="space-y-6 bg-white border border-stone-200 rounded-xl p-8 shadow-sm text-center">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-stone-900">Provisioning Successful</h2>
            <p className="text-stone-600 text-sm max-w-md mx-auto">
              Your independent database, media bucket, repository, and production deployment have been created. The site link becomes available when Vercel finishes its first build.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              {deployResult?.deployUrl && (
                <a
                  href={deployResult.deployUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  Visit Live Portfolio <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {deployResult?.repoUrl && (
                <a
                  href={deployResult.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  View GitHub Repository <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 px-6 text-center text-xs text-stone-500 font-mono">
        Dhanushworks Installer — Live API Provisioning Engine
      </footer>
    </div>
  );
}
