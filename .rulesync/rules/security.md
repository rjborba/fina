---
root: true
targets: ["codexcli", "claudecode"]
description: "Tenant, credential, and sensitive-data safety"
---

## Security rules

- A group is the absolute ownership and authorization boundary. Every account,
  category, import, and transaction belongs to exactly one group and is accessed
  only through active membership.
- Never print, copy, commit, or log secret values. Do not log tokens, database
  credentials, raw statements, signed URLs, transaction descriptions, or SQL
  containing customer data. Secret scan output must keep values masked.
- Store configuration in ignored environment files; commit only non-secret
  `.env.example` templates. Production CORS must use a validated explicit origin
  allowlist.
- Treat destructive operations with care. Group deletion is owner-only, requires
  exact-name confirmation, and atomically deletes the complete tenant aggregate;
  ordinary transaction/import deletion follows the soft-delete contract.
- RLS is deferred, not rejected. Do not add it before application-level
  authorization is implemented and tested.
