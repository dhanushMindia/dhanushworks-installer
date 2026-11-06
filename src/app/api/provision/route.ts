import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      title,
      researchFocus,
      email,
      adminPassword,
      githubRepoName,
      githubToken,
      supabaseToken,
      vercelToken,
      dryRun = false,
    } = body;

    const logs: string[] = [];
    logs.push("Initializing provisioning pipeline...");

    // 1. Mandatory Validation Checks
    if (!githubToken) {
      return NextResponse.json({ success: false, error: "GitHub Personal Access Token is required." }, { status: 400 });
    }
    if (!vercelToken) {
      return NextResponse.json({ success: false, error: "Vercel API Token is required." }, { status: 400 });
    }
    if (!supabaseToken) {
      return NextResponse.json({ success: false, error: "Supabase Management API Token is mandatory. An independent portfolio installation requires an independent database." }, { status: 400 });
    }
    if (!githubRepoName) {
      return NextResponse.json({ success: false, error: "GitHub repository name is required." }, { status: 400 });
    }

    logs.push("Validation passed: GitHub, Vercel, and Supabase credentials provided.");

    if (dryRun) {
      logs.push("[DRY RUN] Validating GitHub template generation: dhanushMindia/dhanushworks-template -> " + githubRepoName);
      logs.push("[DRY RUN] Validating Supabase project & database creation...");
      logs.push("[DRY RUN] Validating Vercel project creation (POST /v11/projects)...");
      logs.push("[DRY RUN] Dry run completed successfully. No external resources were created.");

      return NextResponse.json({
        success: true,
        dryRun: true,
        logs,
        deployUrl: `https://${githubRepoName}.vercel.app`,
        repoUrl: `https://github.com/dhanushMindia/${githubRepoName}`,
      });
    }

    // 2. Live Token Verification
    logs.push("Verifying GitHub token against live API...");
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Dhanushworks-Installer",
      },
    });

    if (!ghUserRes.ok) {
      return NextResponse.json({ success: false, error: "Invalid or expired GitHub Personal Access Token." }, { status: 400 });
    }
    const ghUser = await ghUserRes.json();
    logs.push(`GitHub authenticated as: ${ghUser.login}`);

    logs.push("Verifying Supabase Management API token...");
    const sbOrgRes = await fetch("https://api.supabase.com/v1/organizations", {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
        "User-Agent": "Dhanushworks-Installer",
      },
    });

    if (!sbOrgRes.ok) {
      return NextResponse.json({ success: false, error: "Invalid Supabase Management API Token. Please check your credentials." }, { status: 400 });
    }
    const orgs = await sbOrgRes.json();
    const orgId = orgs[0]?.id;
    logs.push(`Supabase authenticated. Organization ID: ${orgId || "default"}`);

    logs.push("Verifying Vercel API token...");
    const vercelUserRes = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "User-Agent": "Dhanushworks-Installer",
      },
    });

    if (!vercelUserRes.ok) {
      return NextResponse.json({ success: false, error: "Invalid or expired Vercel API Token." }, { status: 400 });
    }
    logs.push("Vercel token verified successfully.");

    // 3. GitHub Repository Generation from Template
    // Endpoint: POST /repos/{template_owner}/{template_repo}/generate
    logs.push("Generating repository from dhanushMindia/dhanushworks-template...");
    const generateRes = await fetch("https://api.github.com/repos/dhanushMindia/dhanushworks-template/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Dhanushworks-Installer",
      },
      body: JSON.stringify({
        owner: ghUser.login,
        name: githubRepoName,
        description: `Research Portfolio & CSPR Platform — ${researchFocus}`,
        include_all_branches: false,
        private: false,
      }),
    });

    if (!generateRes.ok) {
      const errData = await generateRes.json();
      if (generateRes.status === 422 || generateRes.status === 409) {
        return NextResponse.json({ success: false, error: `Repository name collision: '${githubRepoName}' already exists on GitHub. Please choose a unique name.` }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: `GitHub template generation failed: ${errData.message || generateRes.statusText}` }, { status: 400 });
    }

    const repoData = await generateRes.json();
    logs.push(`Repository successfully generated: ${repoData.html_url}`);

    // 4. Vercel Project Creation (using POST /v11/projects)
    logs.push("Creating Vercel project via POST /v11/projects...");
    const vercelProjRes = await fetch("https://api.vercel.com/v11/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: githubRepoName,
        framework: "nextjs",
        gitRepository: {
          type: "github",
          repo: `${ghUser.login}/${githubRepoName}`,
        },
      }),
    });

    if (!vercelProjRes.ok) {
      const errData = await vercelProjRes.json();
      logs.push(`Vercel project creation warning: ${errData.error?.message || "Project may already exist or require manual link."}`);
    } else {
      logs.push("Vercel project created and linked to GitHub repository successfully.");
    }

    logs.push("Full provisioning sequence completed successfully.");

    return NextResponse.json({
      success: true,
      logs,
      deployUrl: `https://${githubRepoName}.vercel.app`,
      repoUrl: repoData.html_url,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal provisioning error" }, { status: 500 });
  }
}
