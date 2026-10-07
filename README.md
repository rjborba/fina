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
builds the shared contracts required by migration tooling, and applies the
TypeORM migrations. It does not modify an existing `.env` file.
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
pnpm test:e2e            # API and isolated Playwright browser journeys
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

Before the first browser run, install its browser with
`pnpm exec playwright install chromium` (CI uses `--with-deps`).
`pnpm test:e2e` builds the API, runs its authentication checks, and then runs
Playwright against a loopback-only application on port 4180. Each run creates a
unique `fina_browser_test_*` database, applies the committed TypeORM migrations,
and uses an isolated identity fixture with locally signed tokens. It never
touches development or production Auth/application records. The database is
dropped when the harness exits; browser traces, videos, and saved sessions are
disabled so tokens are not written to test artifacts.
The integration-test runner requires `pnpm infra:start`. It creates a unique
`fina_test_*` database, runs the migration and API boundary suite with locally
signed JWT fixtures, and drops that database even when the suite fails. CI uses
the same local Supabase path.

## CSV amount signs

For statements with positive charges and negative credits, enable **Invert amount
signs**: `25.00` becomes `−25.00`, and `−25.00` becomes `25.00`. Zero stays zero.
Leaving it disabled preserves source signs; separate debit/credit columns keep
their existing convention. The API confirms inverted values against the uploaded
CSV, so older open browser tabs also import credits correctly.

The source-backed repair migration corrects old imports that used this option
without overwriting manually changed amounts. Original files, categories, dates,
bill assignments, and deletion history are preserved; import totals reflect the
corrected original source rows.

## Monthly review and cash flow

Use **Monthly review** to classify expenses by their household reference month.
When importing a card statement, **Bill due in** identifies the actual bill;
**Include in monthly review** assigns all its purchases to your chosen month.
For example, a bill due in July can belong to June's review, including any July
purchases or older installments on that bill.

In group details, owners can set **Credit-card bills belong to → Previous
month** for future bills. Existing assignments stay unchanged. Open a bill and
use **Move whole bill** to correct its reference month. Checking transactions
normally use their purchase month and can have a separate review-month override.

**Cash flow** shows each card bill once: an unpaid bill is scheduled on its due
date; a confirmed checking payment uses its actual date and amount. Bill details
retain the purchase breakdown. A bill that changes after payment is flagged for
review, while the actual payment amount remains unchanged in cash-flow totals.
Expense responsibility splits and reimbursement balances are a later increment.

## Deployment

The production topology is intentionally split:

- Vercel hosts the Vite web application at `https://fina.rjborba.com`.
- Render hosts the long-running NestJS API behind
  `https://api.fina.rjborba.com`.
- Supabase provides Auth and PostgreSQL; browser application-data requests never
  bypass the Nest API.

The web project's production `VITE_API_URL` must equal the Render API origin.
It also requires `VITE_SUPABASE_URL` and the project's public anon key in
`VITE_SUPABASE_KEY`; never use a service-role key in browser configuration.
The Vercel project uses Node 24.x and the repository pins Node 24.21.0.
The API deployment settings and operational checks are documented in
[`apps/api/DEPLOY_RENDER.md`](./apps/api/DEPLOY_RENDER.md). The repository does
not support deploying the API as a Vercel Function.

CI runs `pnpm verify` and `pnpm test:e2e` on pushes to `main` and pull requests. Hosting platforms
can still deploy independently of that workflow unless their dashboards enforce
the `verify` job as a deployment check. Confirm that gate before treating a
successful Git push as production-ready.

For coupled API/web releases, hold Vercel custom-domain auto-assignment until
the migration and matching Render commit are healthy. Build the production web
deployment without assigning domains, then explicitly promote it and restore
the project's normal auto-assignment setting. This avoids serving a new web
contract against the previous API during rollout.
