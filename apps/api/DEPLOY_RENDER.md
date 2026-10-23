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

| Variable              | Production requirement                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`            | `production`                                                                                                            |
| `DATABASE_URL`        | The production PostgreSQL connection string, stored only in Render. The legacy `SUPABASE_DB_URI` name is also accepted. |
| `DATABASE_SCHEMA`     | `public`                                                                                                                |
| `DATABASE_SSL`        | `true`; certificate verification remains enabled.                                                                       |
| `SUPABASE_URL`        | The production Supabase project URL.                                                                                    |
| `SUPABASE_JWT_SECRET` | The production legacy signing secret when Auth issues HS256 tokens. Signing-key tokens use the project's JWKS instead.  |
| `CORS_ORIGINS`        | `https://fina.rjborba.com`                                                                                              |
| `NODE_EXTRA_CA_CERTS` | `/etc/secrets/supabase-ca.crt`, when using Supabase's database CA.                                                      |

For this persistent API on Render, use the Supabase session pooler on port
`5432`, not the transaction-pooling port `6543`. Download the official server
root certificate from the production project's **Database Settings → SSL
configuration** and add it as a Render file named `supabase-ca.crt`. Node reads
`NODE_EXTRA_CA_CERTS` at startup, allowing the existing verified TLS connection
without disabling certificate checks. See the
[Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
and [Render file configuration](https://render.com/docs/configure-environment-variables#secret-files).

The custom domain must serve `api.fina.rjborba.com` directly. Do not redirect
that origin to `www.api.fina.rjborba.com`: the web client's CORS preflight and
authorization header must reach the configured origin without a host change.
Confirm an `OPTIONS` request from `https://fina.rjborba.com` returns the explicit
allowlisted origin and no redirect before declaring the deployment healthy.

## Deployment procedure

1. Run `pnpm verify` and `pnpm test:e2e` against the candidate commit. For coupled
   API/web changes, temporarily hold Vercel custom-domain auto-assignment before
   pushing so the new web contract cannot reach users ahead of the API.
2. From that exact commit, inspect pending migrations with
   `pnpm --filter @fina/api migration:show`, then apply them from a controlled
   administrative job using `pnpm --filter @fina/api migration:run`.
3. Deploy the same verified commit to the Render `fina-api` service.
4. Confirm the Render deployment is healthy at its `onrender.com` hostname.
5. Confirm TLS and an authenticated API request through
   `https://api.fina.rjborba.com`.
6. Promote the matching Vercel web deployment with `VITE_API_URL` set to that
   API origin and production `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` configured.
   Restore normal Vercel custom-domain auto-assignment and verify the web entry
   point. A complete authenticated browser journey remains the final user-flow
   check; never create synthetic records in production for automated tests.

The monthly-review release adds `AddMonthlyReview1791000000000` after the 13
previous migrations. It is additive: existing bill assignments retain their due
month, historical occurrence timestamps remain untouched, and the default is
unchanged until a group owner chooses the preceding month. Apply this migration
before starting the updated API; no production data rewrite is required.

The amount-sign release adds the data-only
`CorrectImportedAmountSigns1791100000000`. For this release, deploy the verified
API commit **before** running that migration: the API canonicalizes inversion
from the verified CSV and closes the old-browser write path while history is
repaired. No schema change is required for this ordering. Hold web domain
auto-assignment, verify the API is live, apply the migration with
`migration:run --transaction all`, then promote the matching web build.
The migration validates each saved CSV hash/size and physical source row,
corrects source-negative amounts only when stored values match the legacy
float4 calculation, and refreshes original-import totals. Manual amount
overrides, source files, tenant attribution, categories, dates, bill links, and
soft-deletion flags are preserved. Missing or unverifiable sources abort the
whole migration. The correction is idempotent and forward-only; ordinary
rollback must not restore the incorrect financial values.

The historical card-field repair adds the data-only migration
`BackfillImportedCardMetadata1792501867419`. Apply it using the same controlled
TypeORM workflow with `migration:run --transaction all`, after local disposable
PostgreSQL tests and `pnpm verify`. Its `plan(queryRunner)` method supports a
read-only dry run: report only counts by import, conflicts, and unsupported
layouts; never print the returned card values or retained CSV bytes. The repair
recognizes the verified historical name/final-four headers in columns two and
three. It verifies CSV hashes/sizes and physical source rows, preserves existing
card values, and skips deleted history and checking transactions. Before commit,
compare transaction records excluding only the two card fields and compare
retained files, mappings, and reconciliation links. Abort if any differ. The
repair is idempotent and forward-only; do not clear later manual card edits as
a rollback strategy.

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

## Operational status and remaining gaps

On 2026-10-06, the production release of `7fa88ea` passed the repository
verification gate and started successfully on Render. The 12 pending TypeORM
migrations were applied in one transaction, and `migration:show` confirmed all
13 committed migrations are applied. Production database, Supabase Auth,
explicit CORS, and verified database TLS configuration are stored in Render.

The API origin now serves directly without the former `www.api` redirect.
Operational checks at both the Render hostname and `https://api.fina.rjborba.com`
confirmed valid HTTPS, an unauthenticated `401` with the stable error contract
and request identifier, and a `204` CORS preflight for
`https://fina.rjborba.com` without a redirect. These read-only release checks do
not replace a complete authenticated browser journey; automated tests continue
to use disposable local databases only.

The earlier startup failure in `8509f39` was caused by the compiler including the
OpenAPI helper and emitting `dist/src/main.js` instead of `dist/main.js`. The
explicit source root and input scope now preserve the production entry point.
The subsequent runtime failure was missing Render database configuration, not
another build failure.

The service is still on Render's free instance tier, so an always-on instance,
health/readiness endpoints, and a repeatable approved migration workflow remain
release follow-ups. The abandoned Vercel `fina-api` project is not a supported
API target; remove it separately after its deployment history is no longer
needed.

On 2026-10-20, the data-only
`BackfillImportedCardMetadata1792501867419` migration from `3fa3a2f` was applied
to production using verified TLS and a session-mode PostgreSQL connection.
The retained originals supplied card names and final four digits for all 520
active credit purchases across three imports. All 602 active transactions kept
their category assignments. Before/after fingerprints confirmed every other
transaction field, retained CSV, saved mapping, reconciliation, and other
application record was unchanged; deleted and checking transactions were
unchanged in full. A private recovery manifest records the original empty card
fields and expected-result hashes without storing card values or CSV bytes.
The verified migration is committed; `pnpm verify`, 56 disposable-PostgreSQL
integration tests, and all eight browser journeys passed before application.

Supabase's security advisor also reports separate follow-ups for
[PostgreSQL security updates](https://supabase.com/docs/guides/platform/upgrading),
[email OTP expiry](https://supabase.com/docs/guides/platform/going-into-prod#security),
and [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
This deployment does not change the database version, Auth policy, or billing
plan.

## Custom-summary migration receipt

On 2026-10-22 (America/Recife), the following four TypeORM migrations from
verified commit `0f53891` were applied to production in one transaction:

- `WorkspaceCustomValues1792620000000`
- `CustomValueColors1792668625989`
- `CustomValueWidth1792669875893`
- `OptionalCustomValueColor1792702564234`

Before application, `pnpm verify` passed, including all 64 disposable-PostgreSQL
integration tests. `pnpm test:e2e` passed both API authentication tests and all
nine browser journeys. The custom-summary journey creates its own workspace so
categories from preceding journeys cannot contaminate its expectations.

The controlled local administrative job parsed the ignored
`apps/api/.env.production.local` without printing its values, checked that the
Auth project and database connection identify the Fina production project, and
passed the database URL to child processes through their environment, never
command-line arguments. The checked-in migration data source was used without
changes. Per-job overrides selected session-pooling port `5432`,
`DATABASE_SCHEMA=public`, `DATABASE_SSL=true`, and
`DOTENV_CONFIG_PATH=.env.production.local`. The public Supabase root CA was
provided through `NODE_EXTRA_CA_CERTS` **before starting Node**, with certificate
verification left enabled. Connection options set a 10-second lock timeout and
60-second statement timeout. No production configuration file was rewritten.

With that environment, the job invoked these repository commands from the root:

```sh
pnpm --filter @fina/api migration:show
pnpm --filter @fina/api migration:run --transaction all
pnpm --filter @fina/api migration:show
```

CLI output was captured privately and restricted to migration names/statuses;
SQL and credentials were not logged. The preflight found 21 applied migrations
and exactly the four expected pending migrations. The run exited successfully,
and the final `migration:show` marked all 25 migrations applied with none pending.
Read-only PostgreSQL checks confirmed the new table, workspace cascade,
unique-title index, color/width constraints, nullable color without a default,
and no table/sequence access for `anon` or `authenticated`. These additive
migrations do not re-import files or alter existing transaction/category tables.
