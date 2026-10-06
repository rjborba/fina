# Fina API

The Fina API is a NestJS REST application backed by PostgreSQL through TypeORM.
Run `pnpm infra:start` from the repository root, then start the API with
`pnpm dev:api`. Infrastructure setup generates the ignored
`apps/api/.env.local`; the API prefers it over a fallback `apps/api/.env`.
Database configuration accepts either the documented `DATABASE_*` connection
fields or a complete `DATABASE_URL`. Existing ignored environments using
`SUPABASE_DB_URI` remain supported as a compatibility alias. Local CORS defaults
to `http://localhost:5173`; deployments must set their explicit web origins.

Swagger UI is served at `http://localhost:3000/api` during local development.
Repository setup, verification commands, security boundaries, and product
contracts live in the root [README](../../README.md) and
[PROJECT.md](../../PROJECT.md).

`pnpm test:integration` creates a uniquely named disposable database inside the
local Supabase PostgreSQL server and drops it afterward. It does not modify the
development database. Run `pnpm infra:start` before invoking it.

Production runs this API as a conventional Render web service, not as a Vercel
Function. See [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) for the authoritative
hosting configuration and operational checklist.

## Database migrations

TypeORM migrations under `src/database/migrations` are the executable database
history. They are applied explicitly; application startup keeps schema
synchronization disabled and does not mutate the schema.

For every schema change:

1. Start the local Supabase PostgreSQL database with `pnpm infra:start`. It
   applies the existing migration history automatically. To apply it again
   explicitly, run `pnpm db:migrate:local`.
2. Update the TypeORM entities, then generate a new migration instead of editing
   one that has been applied:

   ```sh
   pnpm --filter @fina/api migration:generate \
     src/database/migrations/DescribeTheChange
   ```

3. Review the generated `up` and `down` methods. Edit them when the change needs
   a backfill, safe rename, custom PostgreSQL object, or staged rollout, then
   update the PostgreSQL-backed integration tests for the observable schema and
   behavior.
4. Run `pnpm test:integration` and `pnpm verify`; commit the migration with the
   entities, contracts, tests, and documentation it changes.
5. From the verified release commit, inspect and apply the production migration:

   ```sh
   pnpm --filter @fina/api migration:show
   pnpm --filter @fina/api migration:run
   ```

Never use the Supabase Dashboard or schema synchronization for application
schema changes. `migration:generate` compares the entities with the configured
database, so run it against local Supabase through `apps/api/.env.local`, never
against the hosted Fina database.

The hosted Fina database was reset and rebuilt from
`InitialSchema1789960612000` on 2026-09-21. That baseline is now immutable;
every later production change must be a new TypeORM migration.

For inspection and deployment, the available commands are:

```sh
pnpm --filter @fina/api migration:show
pnpm --filter @fina/api migration:run
```

The clean baseline assumes the disposable/no-data migration described in
`PROJECT.md`. Reset an unused environment instead of trying to reconstruct
legacy authorization state. Never run the baseline over a populated database
without a separate migration plan, and never enable schema synchronization.

Application tables are backend-only: direct Data API privileges are revoked from
`PUBLIC`, `anon`, `authenticated`, and `service_role`, legacy policies and helper
objects are removed, and RLS is disabled. Supabase Auth remains available. The
web uses Supabase only for authentication and sends its access token to Nest.
Do not restore Data API grants without a separately designed and tested RLS
boundary.
