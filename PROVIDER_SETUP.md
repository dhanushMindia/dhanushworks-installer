# Dhanushworks Installer — Complete Provider Setup Manifest

> **Production Base URL:** `https://dhanushworks-installer.vercel.app`

This document outlines the exact OAuth configurations, integration endpoints, required scopes, environment variables, and dashboard setup instructions for deploying and operating the **Dhanushworks Installer** on Vercel.

---

### 1. Exact GitHub App User Authorization Callback URL
- **Callback URL:** `https://dhanushworks-installer.vercel.app/api/auth/github/callback`
- *(If using Personal Access Tokens / PATs, callback URL is not required; PATs are submitted directly to `/api/verify`)*.

### 2. GitHub App Installation / Setup URL
- **GitHub App Settings URL:** `https://github.com/settings/apps/new`
- **Homepage URL:** `https://dhanushworks-installer.vercel.app`

### 3. Exact Supabase OAuth Redirect URI
- **Redirect URI:** `https://dhanushworks-installer.vercel.app/api/auth/supabase/callback`
- *(For Supabase Management API personal tokens, authentication is handled via Bearer token input in the installer wizard).*

### 4. Exact Vercel Integration Redirect URL
- **Redirect URI:** `https://dhanushworks-installer.vercel.app/api/auth/vercel/callback`
- **Vercel Integration Settings URL:** `https://vercel.com/dashboard/integrations`

### 5. Vercel Configuration URL
- **Project Settings & Environment Variables URL:** `https://vercel.com/dashboard` (Select your deployed `dhanushworks-installer` project -> Settings -> Environment Variables).

### 6. Required Environment Variables
| Variable Name | Purpose | Scope / Target |
| :--- | :--- | :--- |
| `DATABASE_URL` | Transaction pooler connection string (Port 6543, `?pgbouncer=true`) for runtime app queries. | Production, Preview, Development |
| `DIRECT_URL` | Direct database connection string (Port 5432) used exclusively for Prisma migrations. | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Cryptographic secret for session management and JWT signing. | Production, Preview, Development |
| `NEXTAUTH_URL` | Canonical URL of the installer deployment (`https://dhanushworks-installer.vercel.app`). | Production, Preview, Development |
| `GITHUB_CLIENT_ID` | OAuth Client ID if using GitHub App authentication flow. | Production |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret if using GitHub App authentication flow. | Production |
| `VERCEL_CLIENT_ID` | Vercel Integration Client ID if using Vercel OAuth flow. | Production |
| `VERCEL_CLIENT_SECRET` | Vercel Integration Client Secret if using Vercel OAuth flow. | Production |

### 7. Required GitHub Permissions (GitHub App / PAT Scopes)
- **Repository Permissions:**
  - `contents`: Read & Write (to clone `dhanushworks-template` and commit initial configuration).
  - `metadata`: Read-only (required for repository API access).
- **Personal Access Token (PAT) Scopes:**
  - `repo` (Full control of private and public repositories).

### 8. Exact Supabase OAuth Scopes & Management API Mappings
- **API Endpoint:** `https://api.supabase.com/v1/organizations`, `https://api.supabase.com/v1/projects`
- **Required Scopes:**
  - `all` (Full access to organizations, projects, and database provisioning endpoints via Supabase Management API).

### 9. Exact Vercel Integration Scopes Mapped to APIs
- **API Endpoint:** `https://api.vercel.com/v2/user`, `https://api.vercel.com/v10/projects`, `https://api.vercel.com/v13/deployments`
- **Required Scopes:**
  - `project:read`, `project:write` (Create and configure project settings).
  - `deployment:read`, `deployment:write` (Trigger production deployments).
  - `env:read`, `env:write` (Inject environment variables securely).

### 10. Required Privacy Policy, Terms & Documentation URLs
- **Privacy Policy:** `https://dhanushworks-installer.vercel.app/privacy`
- **Terms of Service:** `https://dhanushworks-installer.vercel.app/terms`
- **Documentation:** `https://dhanushworks-installer.vercel.app/docs`

### 11. Control-Plane Database Requirement
- **Is a separate control-plane database needed?** Yes, for production multi-tenant or stateful installations where OAuth tokens, audit logs, and provisioning job states must be persisted securely across serverless execution boundaries. For single-tenant or direct token wizard flows (current implementation), stateless verification via `/api/verify` and direct provisioning via `/api/provision` operate securely without persistent token storage.

---

## Manual Provider Dashboard Configuration Guide

To complete integration setup in each provider dashboard, follow these exact steps:

### A. GitHub Developer Settings
1. Go to **GitHub Settings** -> **Developer Settings** -> **OAuth Apps** (or **GitHub Apps**).
2. Click **New GitHub App** (or Register New OAuth Application).
3. Set **App Name**: `Dhanushworks Installer`.
4. Set **Homepage URL**: `https://dhanushworks-installer.vercel.app`.
5. Set **Authorization callback URL**: `https://dhanushworks-installer.vercel.app/api/auth/github/callback`.
6. Configure permissions (`contents: write`, `metadata: read`).
7. Save and copy `Client ID` and generate a `Client Secret`.

### B. Vercel Integration Settings
1. Go to **Vercel Dashboard** -> **Account Settings** -> **Integrations** -> **Create Integration**.
2. Set **Integration Name**: `Dhanushworks Provisioner`.
3. Set **Redirect URL**: `https://dhanushworks-installer.vercel.app/api/auth/vercel/callback`.
4. Select required scopes (`Projects`, `Deployments`, `Environment Variables`).
5. Save and copy `Client ID` and `Client Secret`.

### C. Supabase Dashboard Settings
1. Go to **Supabase Account Settings** -> **Access Tokens**.
2. Click **Generate New Token**.
3. Copy the personal access token (`sbp_...`) for use in database provisioning workflows.
