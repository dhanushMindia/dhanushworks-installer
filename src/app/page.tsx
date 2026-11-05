"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Github,
  Database,
  Globe,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Lock,
  ExternalLink,
  Terminal,
  Layers,
  Sparkles
} from "lucide-react";

export default function InstallerWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "Dhanush Mendu",
    title: "Quantitative Finance & Public Economics Researcher",
    email: "dhanush@example.com",
    domain: "Quantitative Finance",
    githubRepoName: "my-research-portfolio",
    supabaseProjectName: "portfolio-db",
    vercelProjectName: "research-portfolio",
    theme: "minimalist-quantitative"
  });

  const [authStatus, setAuthStatus] = useState({
    github: false,
    supabase: false,
    vercel: false
  });

  const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionComplete, setProvisionComplete] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const simulateOAuth = (service: 'github' | 'supabase' | 'vercel') => {
    // Simulate OAuth connection success
    setAuthStatus(prev => ({ ...prev, [service]: true }));
  };

  const startProvisioning = async () => {
    setIsProvisioning(true);
    setStep(4);

    const logs = [
      "Initializing independent provisioning pipeline...",
      "Authenticating with GitHub API...",
      `Creating independent repository '${formData.githubRepoName}' under your GitHub account...`,
      "Pushing core application codebase & template files...",
      "Authenticating with Supabase Management API...",
      `Provisioning new PostgreSQL database instance '${formData.supabaseProjectName}'...`,
      "Applying database schema migrations & indexes...",
      "Configuring Row Level Security (RLS) & authentication keys...",
      "Authenticating with Vercel API...",
      `Creating Vercel project '${formData.vercelProjectName}'...`,
      "Injecting secure environment variables (DATABASE_URL, DIRECT_URL, JWT secrets, S3 storage)...",
      "Triggering initial production deployment on Fluid Compute...",
      "Verifying edge health check & ISR endpoints...",
      "Provisioning complete successfully! Zero lingering dependencies on Dhanushworks.me."
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setProvisioningLogs(prev => [...prev, logs[i]]);
    }

    setIsProvisioning(false);
    setProvisionComplete(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
              Dhanushworks <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Provisioning Wizard</span>
            </h1>
            <p className="text-xs text-slate-400">Deploy your 100% independent research portfolio in minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Independent Runtime Guarantee
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span className={step >= 1 ? "text-emerald-400 font-semibold" : ""}>1. Architecture & Scope</span>
            <span className={step >= 2 ? "text-emerald-400 font-semibold" : ""}>2. Customization</span>
            <span className={step >= 3 ? "text-emerald-400 font-semibold" : ""}>3. OAuth Authorization</span>
            <span className={step >= 4 ? "text-emerald-400 font-semibold" : ""}>4. Deployment</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Architecture Overview */}
        {step === 1 && (
          <div className="space-y-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Zero SaaS Lock-in Guarantee
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Every Participant Owns Their Infrastructure</h2>
              <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                Dhanushworks.me is strictly an installation and provisioning wizard. We do not host multi-tenant databases or route traffic through a central API. Once provisioned, your portfolio runs entirely within your own cloud accounts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                    <Github className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-white">Your GitHub Repo</h3>
                  <p className="text-xs text-slate-400 mt-1">Full source code ownership under your GitHub account with complete control over code modifications.</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-mono text-blue-400">Direct Git Control</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-white">Your Supabase DB</h3>
                  <p className="text-xs text-slate-400 mt-1">Dedicated PostgreSQL database, private schema migrations, S3 storage, and secure JWT auth.</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-mono text-emerald-400">Isolated PostgreSQL</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-white">Your Vercel Deployment</h3>
                  <p className="text-xs text-slate-400 mt-1">Independent Vercel project with sub-millisecond Edge caching and custom domain support.</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-mono text-purple-400">Fluid Compute Edge</div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                Continue to Customization <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Customization */}
        {step === 2 && (
          <div className="space-y-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Configure Your Portfolio</h2>
              <p className="text-slate-400 mt-1 text-sm">Provide initial profile details and repository naming for your standalone deployment.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Your Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Professional Title / Role</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Research Domain / Field</label>
                <select
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Quantitative Finance">Quantitative Finance & Public Economics</option>
                  <option value="AI & Applied Machine Learning">AI & Applied Machine Learning</option>
                  <option value="Macroeconomics & Policy">Macroeconomics & State Policy Research</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">GitHub Repository Name</label>
                <input
                  type="text"
                  name="githubRepoName"
                  value={formData.githubRepoName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Supabase Project Name</label>
                <input
                  type="text"
                  name="supabaseProjectName"
                  value={formData.supabaseProjectName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Vercel Project Name</label>
                <input
                  type="text"
                  name="vercelProjectName"
                  value={formData.vercelProjectName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all flex items-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 text-sm"
              >
                Proceed to Authorization <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: OAuth Authorization */}
        {step === 3 && (
          <div className="space-y-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Authorize Cloud Providers</h2>
              <p className="text-slate-400 mt-1 text-sm">We need temporary scoped permissions to provision resources in your personal accounts. Passwords are never stored.</p>
            </div>

            <div className="space-y-4 pt-4">
              {/* GitHub Auth */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">GitHub Account</h3>
                    <p className="text-xs text-slate-400">Required to create repository & push template code</p>
                  </div>
                </div>
                <div>
                  {authStatus.github ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                    </span>
                  ) : (
                    <button
                      onClick={() => simulateOAuth('github')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-all border border-slate-700"
                    >
                      Connect GitHub
                    </button>
                  )}
                </div>
              </div>

              {/* Supabase Auth */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Supabase Organization</h3>
                    <p className="text-xs text-slate-400">Required to provision database instance & apply migrations</p>
                  </div>
                </div>
                <div>
                  {authStatus.supabase ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                    </span>
                  ) : (
                    <button
                      onClick={() => simulateOAuth('supabase')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-all border border-slate-700"
                    >
                      Connect Supabase
                    </button>
                  )}
                </div>
              </div>

              {/* Vercel Auth */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-900 flex items-center justify-center text-purple-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Vercel Account</h3>
                    <p className="text-xs text-slate-400">Required to create Vercel project & configure environment variables</p>
                  </div>
                </div>
                <div>
                  {authStatus.vercel ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                    </span>
                  ) : (
                    <button
                      onClick={() => simulateOAuth('vercel')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-all border border-slate-700"
                    >
                      Connect Vercel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all flex items-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={!authStatus.github || !authStatus.supabase || !authStatus.vercel}
                onClick={startProvisioning}
                className={`px-6 py-2.5 font-medium rounded-xl transition-all flex items-center gap-2 text-sm shadow-lg ${
                  authStatus.github && authStatus.supabase && authStatus.vercel
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Start Provisioning <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Provisioning Execution & Success */}
        {step === 4 && (
          <div className="space-y-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                {isProvisioning && <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />}
                {provisionComplete ? "Provisioning Successfully Completed!" : "Provisioning Your Independent Infrastructure..."}
              </h2>
              <p className="text-slate-400 mt-1 text-sm">
                {provisionComplete
                  ? "Your standalone portfolio has been successfully deployed to your personal accounts."
                  : "Please wait while we orchestrate your repository, database, and edge deployment."}
              </p>
            </div>

            {/* Terminal logs */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2 shadow-inner">
              {provisioningLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-emerald-500">❯</span>
                  <span className={log.includes("successfully") ? "text-emerald-400 font-semibold" : ""}>{log}</span>
                </div>
              ))}
              {isProvisioning && (
                <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                  <span>❯</span>
                  <span>Executing pipeline step...</span>
                </div>
              )}
            </div>

            {provisionComplete && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-mono text-slate-400">GitHub Repository</div>
                      <div className="font-semibold text-white text-sm mt-0.5">{formData.githubRepoName}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </a>

                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-mono text-slate-400">Supabase Database</div>
                      <div className="font-semibold text-white text-sm mt-0.5">{formData.supabaseProjectName}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </a>

                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-mono text-slate-400">Vercel Deployment</div>
                      <div className="font-semibold text-white text-sm mt-0.5">{formData.vercelProjectName}.vercel.app</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>
                    <strong>Runtime Independence Verified:</strong> Your application operates entirely on your infrastructure. Dhanushworks.me has zero runtime dependency, access, or telemetry on your deployed site.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30 py-6 px-6 text-center text-xs text-slate-500 font-mono">
        Dhanushworks Provisioning Architecture — Self-Contained Independent Deployments
      </footer>
    </div>
  );
}
