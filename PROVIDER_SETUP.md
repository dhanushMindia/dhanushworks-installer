# Dhanushworks Installer — Provider setup

The installer uses a direct, one-time provisioning flow. It does not implement OAuth callbacks and does not store provider tokens. Tokens are sent over HTTPS only for the active request and are never written to the database, repository, or logs.

## What a live run creates

For each CSPR researcher the installer creates:

- a private GitHub repository generated from `dhanushMindia/dhanushworks-template`;
- a separate Supabase project and private `portfolio-media` storage bucket;
- a Vercel project with encrypted environment variables;
- an initial production deployment, whose build applies Prisma migrations and creates the first administrator and profile.

The no-change validation verifies all three provider tokens, confirms a Supabase organization is accessible, and checks that the selected GitHub repository name is free. It creates nothing.

## Required credentials

### GitHub

Create a classic personal access token with the `repo` scope. It must be able to create private repositories under the selected account and use template repositories. If you use a fine-grained token instead, grant repository administration/content access sufficient to create a private repository from a template.

### Supabase

Create a Supabase personal access token in Account Settings → Access Tokens. It needs permission to list organizations, create projects, retrieve project API keys, and create storage buckets. The installer selects the first available organization unless its slug is entered explicitly.

### Vercel

Create a Vercel access token in Account Settings → Tokens with permission to create projects, set encrypted environment variables, and create deployments. Ensure the Vercel account’s GitHub integration can access repositories created in the target GitHub account; Vercel will otherwise return a clear project/deployment error.

## Generated configuration

The provisioned portfolio receives `DATABASE_URL`, `DIRECT_URL`, authentication configuration, initial administrator and profile values, plus server-only Supabase storage settings. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or prefix it with `NEXT_PUBLIC_`.

## Operational notes

- A Supabase project can take a few minutes to reach a healthy state. The installer waits before creating the repository and deployment.
- If a provider fails after the database was created, preserve the error message and retry deliberately. Do not reuse an existing repository name for a new provision request.
- Every researcher’s content is controlled through their portfolio CMS after the first sign-in; the initial profile contains only the details entered during provisioning.
