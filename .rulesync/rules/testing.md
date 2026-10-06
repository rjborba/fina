---
root: true
targets: ["codexcli", "claudecode"]
description: "Behavioral testing and verification"
---

## Testing and verification

- Prefer a small set of tests proving behavior over generated existence tests or
  coverage targets. Remove broken placeholder `should be defined` tests.
- Automated tests must never use production, the development database, or a
  shared Supabase database. Use uniquely named disposable databases inside
  local Supabase PostgreSQL for migrations, repositories, transactions,
  cascades, scoping, and authorization.
- Security coverage must reject missing/invalid identity, cross-group access,
  client identifier bypasses, invalid role capabilities, incomplete aggregate
  deletion, and irreversible individual import deletion.
- Run the narrowest relevant checks while iterating, then `pnpm verify` before
  completion. The canonical gates are `format:check`, `lint`, `typecheck`,
  `test`, `test:integration`, `build`, RuleSync drift, secret scan, and generated
  API-client drift. Run `test:e2e` once the first complete journey exists.
