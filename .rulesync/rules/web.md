---
root: true
targets: ["codexcli", "claudecode"]
description: "React web application boundaries"
---

## Web rules

- Use the generated client under `apps/web/src/api/generated` for API transport
  and wrap operations in TanStack Query hooks. Never edit generated files.
- Use Vitest for pure functions/hooks, React Testing Library for meaningful UI
  behavior, and a small number of Playwright journeys. Avoid snapshot-heavy and
  implementation-detail tests.
- Keep Supabase Auth as identity provider. Never persist or log access tokens,
  raw statements, transaction descriptions, signed URLs, or customer financial
  data beyond the explicit product contract.
- Validate public Vite configuration at startup. Public Supabase anon keys may be
  configured in ignored local files, but production credentials must never be
  used for local development.
- The first browser journey is the secure account-to-CSV-import flow described
  in `PROJECT.md`; do not stabilize unrelated screens by expanding scope.
