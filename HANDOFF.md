# CSPR Portfolio Installer — Handoff

**Live installer:** https://dhanushworks-installer.vercel.app  
**Repository:** https://github.com/dhanushMindia/dhanushworks-installer  
**Branch:** `main`

## What it does

The installer creates a private CSPR researcher portfolio from the Dhanushworks template. It connects the researcher's GitHub, Supabase, and Vercel accounts, then creates:

1. A dedicated Supabase project and private `portfolio-media` bucket.
2. A private GitHub repository generated from the template.
3. A Vercel project with encrypted environment variables.
4. The first production deployment.

The generated portfolio retains the theme switcher, CMS, uploads, search, and authentication from the template.

## Researcher flow

1. Complete Profile.
2. Connect GitHub, Supabase, and Vercel with OAuth.
3. Confirm the three providers show as connected.
4. Run the no-change dry run if desired.
5. Press **Execute Live Provisioning** once.

OAuth returns the researcher to the installer and restores their in-progress form. Provider tokens are never placed into the browser form by OAuth.

## Provisioning and recovery behaviour

- A new Supabase project can take several minutes to become ready.
- The installer records the new project reference and database password in an encrypted, HttpOnly cookie.
- If Supabase temporarily reports it is still preparing, the installer automatically continues the same installation up to three times. Do **not** start another installation or change the repository name.
- A successful continuation reuses the original database rather than creating a second project.
- Saved recovery information is cleared after deployment starts successfully.

## Known external constraint: Supabase project quota

Supabase may reject a new project when the account or organization has reached its active free-project limit. In that situation the installer deliberately creates **no** GitHub repository or Vercel project.

Resolve this in Supabase by pausing/deleting an unneeded project or upgrading the relevant plan, then start a fresh installation. Do not delete any project unless its owner has identified it as safe to remove.

## Operational checks

- The production application should return `200`: `https://dhanushworks-installer.vercel.app`.
- OAuth callbacks must remain exactly:
  - `https://dhanushworks-installer.vercel.app/api/oauth/github/callback`
  - `https://dhanushworks-installer.vercel.app/api/oauth/supabase/callback`
  - `https://dhanushworks-installer.vercel.app/api/oauth/vercel/callback`
- Vercel OAuth must use Authorization Code and `client_secret_post` client authentication.
- Keep the installer’s OAuth client secrets and `INSTALLER_TOKEN_ENCRYPTION_KEY` set as encrypted Vercel environment variables. Never expose them in the browser or repository.

## Security action

OAuth client secrets were shared in an interactive support conversation during setup. Rotate the GitHub, Supabase, and Vercel client secrets after confirming the live flow, then update the encrypted Vercel environment variables with the replacement values.

