# Fina

Fina is an early-stage financial collaboration product. Authenticated people can
work in financial groups, manage accounts and categories, import statement
transactions, and review or edit those transactions. The current application is
an incomplete prototype: authentication exists, but tenant authorization and the
secure CSV-import journey are not finished.

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
- Docker for PostgreSQL integration tests.

Do not use production credentials locally. Use a dedicated non-production
Supabase project for interactive login and an isolated local database.

## Local setup

```sh
nvm use
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm run setup
```

Use the explicit `run` form because `pnpm setup` is a pnpm command that edits
the user's shell configuration rather than running this repository's script.

Copy the safe examples and replace placeholders only in the ignored local files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The API loads `apps/api/.env` when started from its workspace. The web app uses
Vite variables from `apps/web/.env`. Never commit either file, raw statements,
tokens, or customer financial data. The repository root `.env.example` lists
cross-workspace test/CI configuration.

## Commands

```sh
pnpm dev                 # run all development servers
pnpm format:check        # verify formatting without writing files
pnpm lint                # lint every applicable workspace
pnpm typecheck           # type-check every workspace
pnpm test                # unit tests
pnpm test:integration    # isolated Docker PostgreSQL tests
pnpm test:e2e            # API/browser journeys (browser journey is deferred)
pnpm build               # production builds
pnpm rules:generate      # regenerate AGENTS.md and CLAUDE.md
pnpm rules:check         # validate RuleSync config and generated-file drift
pnpm api:client:generate # regenerate OpenAPI and the web API client
pnpm api:client:check    # reject hand-written/drifted generated client files
pnpm secrets:check       # masked secret scan
pnpm verify              # complete repository-health contract
```

`pnpm verify` runs the browser journey only after that journey is introduced.
Today `pnpm test:e2e` exposes the existing API E2E surface separately.

## Deployment gate

CI runs `pnpm verify` on every push to `main`. Repository configuration cannot
inspect or change the connected Vercel projects, so the owner must configure both
projects manually: in each Vercel project's production environment settings,
enable automatic aliasing, add the GitHub Actions `verify` job as a required
Deployment Check, and confirm `main` is the Production Branch. Until both
projects have that setting, a green-before-production gate is not guaranteed.

The current API Vercel adapter and the stale Render guide are not a hosting
decision. A later deployment spike will decide between native Vercel NestJS and
an always-on API host.
