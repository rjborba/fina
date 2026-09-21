---
root: true
targets: ["codexcli", "claudecode"]
description: "NestJS API boundaries and contracts"
---

## API rules

- Keep the separate NestJS REST API; do not add tRPC or an API version prefix.
- Zod schemas in `@fina/types` are authoritative request/response contracts.
  Nest validates them at runtime and derives OpenAPI; TypeORM entities stay
  private to the API and are not response contracts.
- Derive identity from a verified Supabase token. Enforce authorization through
  a shared membership policy/guard plus group-scoped service/repository queries,
  never only through ad hoc controller checks.
- Never trust client-supplied `groupId` or `userId`. Cross-tenant access must fail
  without confirming whether the resource exists.
- Keep `synchronize: false`; commit and PostgreSQL-test every migration.
- API tests should assert observable validation, domain, authorization,
  transaction, query-scoping, migration, and cascade behavior. Mock repositories
  only in narrow unit tests.
- Stable API errors contain `code`, `message`, optional field `details`, and a
  request identifier; never leak stacks, SQL, tokens, or internal exception text.
