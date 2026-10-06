# Fina

Fina is an early-stage financial collaboration product. Authenticated people can
work in financial groups, manage accounts and categories, import statement
transactions, and review or edit those transactions. Supabase provides identity;
all application data access and tenant authorization goes through the NestJS API.
The CSV journey detects and normalizes statements in the browser, validates a
strict safe payload in NestJS, and atomically persists duplicate-protected
imports and reusable group-scoped profiles.

See [PROJECT.md](./PROJECT.md) for the current/target/gap product truth, security
invariants, feature contracts, and architecture decisions. The generated
[OpenAPI document](./apps/api/openapi.json) is committed; when the API is
running, Swagger UI is available at `http://localhost:3000/api`.

## Repository map

- `apps/api`: NestJS REST API, TypeORM entities, and PostgreSQL access.
- `apps/web`: React/Vite web application using TanStack Query and Supabase Auth.
- `packages/types`: transport-neutral Zod schemas and API contracts shared by
  the API and web app.
- `.rulesync`: the only editable source for generated agent instructions.

## Prerequisites

- Node.js `24.21.0` exactly (see `.nvmrc`).
- Corepack, supplied with the supported Node release.
- pnpm `10.0.0`, activated through Corepack.
- Docker for local Supabase and PostgreSQL integration tests.

Do not use production credentials locally. Interactive development uses the
local Supabase Auth and PostgreSQL services. Integration tests create and drop a
uniquely named database inside local Supabase PostgreSQL; they never use the
development database.

## Local setup

```sh
nvm use
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm run setup
pnpm infra:start
```

Use the explicit `run` form because `pnpm setup` is a pnpm command that edits
the user's shell configuration rather than running this repository's script.

`pnpm infra:start` starts the repository-root Supabase stack, generates ignored
`apps/api/.env.local` and `apps/web/.env.local` files from its local credentials,
and applies the TypeORM migrations. It does not modify an existing `.env` file.
The first run downloads the required Docker images. Start the applications after
the infrastructure is ready:

```sh
pnpm dev
```

The API prefers `apps/api/.env.local` and falls back to `apps/api/.env`. Vite
loads `apps/web/.env.local` with its standard environment precedence. Never
commit these files, raw statements, tokens, or customer financial data. The
`.env.example` files document the shape of the generated local configuration.

## Commands

```sh
pnpm dev                 # run all development servers
pnpm infra:start         # start local Supabase, configure apps, run migrations
pnpm infra:status        # show local service URLs without printing credentials
pnpm infra:stop          # stop local Supabase and preserve its data
pnpm db:migrate:local    # apply TypeORM migrations to local Supabase PostgreSQL
pnpm format:check        # verify formatting without writing files
pnpm lint                # lint every applicable workspace
pnpm typecheck           # type-check every workspace
pnpm test                # unit tests
pnpm test:integration    # disposable database in local Supabase PostgreSQL
pnpm test:e2e            # API/browser journeys (browser journey is deferred)
pnpm build               # production builds
pnpm --filter @fina/api migration:generate \
  src/database/migrations/DescribeTheChange # generate a local migration
pnpm --filter @fina/api migration:show    # list applied/pending migrations
pnpm --filter @fina/api migration:run     # apply pending migrations
pnpm rules:generate      # regenerate AGENTS.md and CLAUDE.md
pnpm rules:check         # validate RuleSync config and generated-file drift
pnpm api:client:generate # regenerate OpenAPI and the web API client
pnpm api:client:check    # reject hand-written/drifted generated client files
pnpm secrets:check       # masked secret scan
pnpm verify              # complete repository-health contract
```

`pnpm test:e2e` exposes the existing API E2E surface separately. The import
experience currently has pure parser and React Testing Library journey coverage;
a Playwright browser harness remains deferred until isolated Auth plus database
fixtures can be provisioned without touching the development database.
The integration-test runner requires `pnpm infra:start`. It creates a unique
`fina_test_*` database, runs the migration and API boundary suite with locally
signed JWT fixtures, and drops that database even when the suite fails. CI uses
the same local Supabase path.

## Deployment

The production topology is intentionally split:

- Vercel hosts the Vite web application at `https://fina.rjborba.com`.
- Render hosts the long-running NestJS API behind
  `https://api.fina.rjborba.com`.
- Supabase provides Auth and PostgreSQL; browser application-data requests never
  bypass the Nest API.

The web project's production `VITE_API_URL` must equal the Render API origin.
The API deployment settings and operational checks are documented in
[`apps/api/DEPLOY_RENDER.md`](./apps/api/DEPLOY_RENDER.md). The repository does
not support deploying the API as a Vercel Function.

CI runs `pnpm verify` on pushes to `main` and pull requests. Hosting platforms
can still deploy independently of that workflow unless their dashboards enforce
the `verify` job as a deployment check. Confirm that gate before treating a
successful Git push as production-ready.
