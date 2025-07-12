# Deploying @fina/api to Render

This guide explains how to deploy the API service from this monorepo to Render.

## Prerequisites

- A Render account
- This repository connected to your Render account

## Deployment Options

### Option 1: Using render.yaml (Recommended)

1. The `render.yaml` file in the root directory is already configured for deployment
2. In Render Dashboard:
   - Click "New +" → "Blueprint"
   - Connect your GitHub/GitLab repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply"

### Option 2: Manual Service Configuration

If you prefer to configure the service manually in Render's dashboard:

1. Create a new Web Service in Render
2. Connect your repository
3. Configure the service with these settings:

   **Build Command:**
   ```bash
   npm install -g pnpm@10.0.0 && \
   pnpm install --frozen-lockfile && \
   pnpm --filter @fina/types build && \
   pnpm --filter @fina/api build
   ```

   **Start Command:**
   ```bash
   cd apps/api && pnpm start:prod
   ```

   **Root Directory:** Leave blank (use repository root)

## Environment Variables

Make sure to set these environment variables in Render:

- `NODE_ENV=production`
- Any database connection strings
- Any API keys or secrets your application needs

## Important Notes

1. The build process must:
   - Install pnpm (the package manager used by this monorepo)
   - Build the `@fina/types` package first (dependency)
   - Then build the API

2. The monorepo uses pnpm workspaces, which is why we need to:
   - Run commands from the repository root
   - Use `--filter` flags to target specific packages
   - Build dependencies before the main application

## Troubleshooting

If you encounter "module not found" errors for `@fina/types`:
- Ensure the build command includes `pnpm --filter @fina/types build`
- Check that the build is running from the repository root, not from `apps/api`

If the build fails with pnpm errors:
- Make sure pnpm version matches the one in package.json (10.0.0)
- Ensure `pnpm install` runs with `--frozen-lockfile` flag 