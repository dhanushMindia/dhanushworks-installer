export default function SupportPage() {
  return <main className="mx-auto max-w-3xl p-8 text-slate-900"><h1 className="text-3xl font-bold">Dhanushworks Installer Support</h1><p className="mt-6">For provisioning issues, open an issue in the installer repository with the non-sensitive error message and the step that failed. Never include OAuth tokens, passwords, database URLs, or API keys.</p><p className="mt-4">The installer creates resources through each provider&apos;s OAuth flow and returns actionable provider errors when a scope or account limit needs attention.</p></main>;
}
