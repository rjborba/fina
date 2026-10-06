# Deploying `@fina/api` to Render

Render is the production host for the NestJS API. Vercel hosts only the Vite web
application. The production web project must set:

```text
VITE_API_URL=https://api.fina.rjborba.com
```

## Render service configuration

The existing Render service uses these settings:

| Setting           | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Service type      | Web Service                                                            |
| Runtime           | Node                                                                   |
| Repository        | `rjborba/fina`                                                         |
| Branch            | `main`                                                                 |
| Root directory    | `apps/api`                                                             |
| Region            | Oregon (US West)                                                       |
| Build command     | `pnpm install --frozen-lockfile && turbo run build --filter=@fina/api` |
| Start command     | `pnpm start:prod`                                                      |
| Custom API origin | `https://api.fina.rjborba.com`                                         |

The API must listen on Render's `PORT`; Nest already reads that value from the
validated environment. Keep auto-deploy limited to changes under `apps/api` and
`packages/types`.

The production TypeScript build compiles only `apps/api/src`, with that directory
as its source root, and emits `apps/api/dist/main.js` for `pnpm start:prod`.
Incremental compiler metadata stays under `dist` so Nest clears it together with
the build output and repeated builds recreate the entry point.
CLI helpers under `apps/api/scripts`, including OpenAPI generation, run separately
and must not change the production output layout. Run `pnpm build:api` from the
repository root and confirm that entry point exists before deploying.

## Environment

Configure the production equivalents of every required variable documented in
[`.env.example`](./.env.example). Store values only in Render's environment
settings—never in this repository, deploy hooks, build commands, or logs.

At minimum, production needs database configuration, Supabase Auth
configuration, and an explicit `CORS_ORIGINS=https://fina.rjborba.com` value.
The API database role must be able to use the migrated application schema; the
Supabase browser roles remain denied direct access.

## Deployment procedure

1. Run `pnpm verify` against the candidate commit.
2. From that exact commit, inspect pending migrations with
   `pnpm --filter @fina/api migration:show`, then apply them from a controlled
   administrative job using `pnpm --filter @fina/api migration:run`.
3. Deploy the same verified commit to the Render `fina-api` service.
4. Confirm the Render deployment is healthy at its `onrender.com` hostname.
5. Confirm TLS and an authenticated API request through
   `https://api.fina.rjborba.com`.
6. Deploy the Vercel web project with `VITE_API_URL` set to that API origin and
   verify a complete authenticated browser journey.

Application startup never synchronizes or migrates the schema automatically.
Do not place `migration:run` in the normal start command: a failed migration
must stop deployment before new application instances receive traffic.
Never edit an applied migration or make application-schema changes in the
Supabase Dashboard. The workflow for authoring and testing a new migration is
documented in [README.md](./README.md#database-migrations).

Production migrations should run from a manually approved release workflow,
not automatically for every merge to `main`. The workflow should use a GitHub
`production` environment, read the database URL from an environment secret, run
`migration:show` and `migration:run` from the verified commit, and only then
deploy the API. Use the Supabase direct connection for migrations, or the
session-mode pooler when the runner cannot reach the direct IPv6 endpoint; do
not use the transaction-mode pooler.

## Current operational gap

The Render dashboard was inspected on 2026-10-05. The deployment of `8509f39`
built successfully but failed at startup: the compiler included the OpenAPI
helper and emitted `dist/src/main.js`, while `pnpm start:prod` expected
`dist/main.js`. The production build now has an explicit source root and input
scope to preserve that entry point. Deploy the corrected commit using the
procedure above; the last successful Render deployment is still `f327937`, and
the custom API domain still fails TLS negotiation. Treat production as unhealthy
until the deployment procedure succeeds. The abandoned Vercel `fina-api` project
is not a supported API target and should be removed separately after its
deployment history is no longer needed.
