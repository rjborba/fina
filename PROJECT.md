# Fina product and architecture

## Purpose and users

Fina is intended for people who want to collaborate on finances inside a group
without exposing that group's data to unrelated customers. It combines group
membership, accounts, categories, CSV statement import, and transaction review.

This document distinguishes verified current behavior from the intended target.
Existing code is evidence, not an implicit specification.

## Product status

| Area                | Current                                                                                                                                                                  | Target                                                                                                                             | Gap                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Identity            | The API globally verifies a Supabase JWT with a configured secret.                                                                                                       | A typed authenticated identity is derived from every verified token.                                                               | Attach identity to requests and define stable authentication errors.                                                             |
| Tenant isolation    | Many routes accept client-supplied group or resource identifiers; shared membership authorization is absent.                                                             | Every query and mutation is membership-checked and group-scoped without resource-existence disclosure.                             | Implement the phase-two membership policy/guard and scoped repositories.                                                         |
| Roles               | No reliable owner/member policy is enforced.                                                                                                                             | Owners administer groups and members; both roles manage financial data.                                                            | Add role data, policies, and tests.                                                                                              |
| Accounts/categories | Basic screens, routes, services, and entities exist.                                                                                                                     | Members manage group-scoped accounts and categories; referenced records archive.                                                   | Secure, complete, and test the behavior.                                                                                         |
| CSV import          | The web has parsing/mapping code and the API has import records, but the end-to-end contract is incomplete.                                                              | Preview validated generic mapping, detect same-file duplicates, atomically persist normalized rows, and retain safe metadata only. | Build the first secure vertical slice after authorization.                                                                       |
| Transactions        | Listing/editing code exists; amounts use floating point and one date field carries mixed meaning.                                                                        | Group-scoped review/editing, exact minor-unit money, explicit posting/accounting/occurrence dates, and soft deletion.              | Secure first; migrate money and dates later with explicit data handling.                                                         |
| Invitations         | Partial entity/routes exist.                                                                                                                                             | Email-bound, single-use, revocable, seven-day invitations create member memberships.                                               | Implement lifecycle, verified-email matching, authorization, and tests.                                                          |
| Group deletion      | Delete endpoints exist without the complete required aggregate semantics.                                                                                                | Owner types the group name; one database transaction hard-deletes the tenant aggregate with tested cascades.                       | Implement after authorization and schema constraints.                                                                            |
| API contracts       | Zod DTOs generate committed OpenAPI and fetch-client outputs, but unfinished endpoints lack some explicit schemas and the web still uses handwritten transport wrappers. | Transport-neutral Zod schemas drive validation, OpenAPI, the generated client, and TanStack Query hooks.                           | Complete endpoint annotations, remove Nest-specific shared concerns, and migrate hooks after authorization stabilizes responses. |

## Domain glossary

- **Group**: the absolute tenant, ownership, and authorization boundary.
- **Membership**: an active relationship between one authenticated user and one
  group, with an `owner` or `member` role.
- **Account**: a financial account owned by one group, with one ISO 4217
  currency and account-level timezone in the target model.
- **Category**: a group-owned classification applied to transactions.
- **Import**: metadata for one confirmed source file and its normalized mapping;
  original CSV contents and complete source rows are not retained.
- **Transaction**: a group-owned financial record, optionally created by an
  import, soft-deleted during ordinary removal.
- **Invitation**: a time-limited, revocable offer for one verified email address
  to join one group as a member.

## Domain and security invariants

- Every account, category, import, invitation, membership, and transaction is
  scoped to exactly one group where applicable.
- Active membership is required for group data. Never trust a client-supplied
  `groupId` or `userId`; derive identity from the verified token and authorize
  against membership.
- Cross-tenant failures must not reveal whether a target resource exists.
- Owners may rename/delete the group, invite/remove members, and transfer
  ownership. Members may manage accounts, categories, imports, and transactions.
  Both may view membership and financial data. A final owner cannot leave.
- Invitations target one email, expire after seven days, are single-use and
  revocable, and require an authenticated account with the same verified email.
- Do not commit or log tokens, credentials, raw statements, signed URLs,
  transaction descriptions, customer-bearing SQL, or personal financial data.
- Production CORS uses an explicit validated origin allowlist. Local, test, and
  production configuration remain separate.
- Transaction amounts will use integer minor units and inherit account currency.
  No initial currency conversion or cross-currency totals are allowed.
- `occurredAt`, `postedDate`, `accountingDate`, and UTC `createdAt` represent
  different meanings. A source time without a zone uses the account timezone.

## Active milestone

Phase one establishes a safe, reproducible harness: documentation, synchronized
agent rules, credential removal, validated environment configuration, pinned
runtimes and tooling, honest package gates, secret scanning, tests, and CI.

The next milestone is typed authentication identity plus group-scoped NestJS
authorization. The first product journey after that is: an authenticated member
creates an account, previews and validates a generic CSV mapping, confirms an
atomic import, and sees its transactions only inside that group.

## Feature contracts

### Group collaboration and membership

1. **User outcome:** people collaborate inside a named financial group.
2. **Authorization boundary:** active membership permits reads; owner-only
   operations administer the group and membership.
3. **Business rules:** roles are `owner` and `member`; members cannot elevate
   themselves or invite; the final owner transfers ownership before leaving.
4. **Acceptance criteria:** role capabilities and cross-tenant denial are proven
   with PostgreSQL-backed tests; inaccessible resources are not disclosed.
5. **Non-goals:** RLS and public API versioning are not part of this milestone.
6. **Discrepancy:** current routes and services do not consistently enforce
   membership or ownership.

### CSV statement import

1. **User outcome:** a member maps, previews, validates, and confirms a generic
   CSV statement into one account.
2. **Authorization boundary:** the user must be an active member of the account's
   group; all account, import, and transaction IDs are tenant-scoped server-side.
3. **Business rules:** validate CSV type and configured size before parsing;
   normalize against a strict schema; one invalid row rejects the atomic import;
   browser SHA-256 is duplicate metadata, not proof; identical hash is blocked
   per group/account; retain safe metadata, never original content/source rows.
4. **Acceptance criteria:** preview shows field failures; confirmation is all or
   nothing; duplicates conflict; imported transactions appear only to members;
   a browser journey and PostgreSQL integration tests prove the flow.
5. **Non-goals:** bank-specific formats, overlapping-range warnings, original
   file retention, currency conversion, and cross-currency totals.
6. **Discrepancy:** parsing/mapping and persistence fragments exist, but there is
   no complete secure, atomic, duplicate-aware contract.

### Transaction and import deletion

1. **User outcome:** users can remove mistaken data without silently losing the
   recoverability expected for ordinary financial edits.
2. **Authorization boundary:** active group membership is required.
3. **Business rules:** transaction deletion is soft; deleting one import
   soft-deletes its transactions; referenced accounts/categories archive.
4. **Acceptance criteria:** default queries omit soft-deleted rows and tests can
   recover them; import deletion leaves recoverable related transactions.
5. **Non-goals:** a user-facing recovery workflow in the first import milestone.
6. **Discrepancy:** current relations include physical cascades and do not fully
   implement the target soft-deletion policy.

### Group deletion

1. **User outcome:** an owner can permanently delete a group with clear intent.
2. **Authorization boundary:** owner only.
3. **Business rules:** the owner types the exact group name; deletion is an
   immediate, single database transaction covering the complete tenant aggregate.
4. **Acceptance criteria:** transactions, accounts, categories, imports,
   invitations, and memberships are gone; any failure rolls everything back;
   foreign-key cascades are explicitly tested.
5. **Non-goals:** delayed deletion or a recovery window.
6. **Discrepancy:** the existing delete path does not prove confirmation,
   ownership, transactionality, or complete cascade behavior.

## Architecture

The pnpm/Turborepo monorepo contains a React/Vite browser app, a separate NestJS
REST API, and `@fina/types`. Supabase remains the identity provider. NestJS owns
application authorization and PostgreSQL access through TypeORM. Zod schemas in
the shared package are the authoritative transport contracts; entities remain
API-private. OpenAPI and the generated web client are outputs. The client wraps
generated operations in TanStack Query hooks.

TypeORM migrations are the only supported production schema-change mechanism;
synchronization stays disabled. Automated integration tests use isolated Docker
PostgreSQL and never a shared Supabase project.

## Architecture decisions

| Decision                              | Rationale                                                                                                                                             | Status                    | Revisit trigger                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Separate NestJS REST API              | Existing controller/service/guard/Swagger boundary is substantial; changing transport does not solve authorization.                                   | Accepted                  | REST creates demonstrated maintenance cost after the secure import milestone and Fina remains browser/TypeScript-only.  |
| Application authorization before RLS  | A shared policy plus scoped queries is testable and addresses the immediate gap.                                                                      | Accepted; not implemented | After application authorization is implemented and tested.                                                              |
| Zod contracts generate OpenAPI/client | Keeps runtime validation and TypeScript clients aligned; `@hey-api/openapi-ts` 0.84.0 supports Node 24.21 and produces a self-contained fetch client. | Accepted; generated       | Generated output stops fitting TanStack Query wrappers or a later compatible generator materially improves maintenance. |
| No API version prefix                 | Only one coupled browser client exists.                                                                                                               | Accepted                  | Second independently deployed client, public API, integration, or compatibility promise.                                |
| Vercel leads hosting spike            | Two projects fit the current apps, but native Nest, pooling, regions, import limits, health, and OpenAPI need proof.                                  | Candidate only            | Spike fails any core criterion; then prefer an always-on API host.                                                      |
| Secretlint 13.0.5                     | Node-based, reproducibly pinned, broad recommended rules, and masked findings by default.                                                             | Accepted                  | Material false positives, missed supported credential types, or maintenance failure.                                    |
| RuleSync 16.39.1                      | Supports the confirmed `codexcli` and `claudecode` targets and strict drift checking on Node 24.                                                      | Accepted                  | Target incompatibility or breaking upgrade requirement.                                                                 |

## Non-goals and deferred decisions

Phase one does not implement the authorization rewrite, RLS, tRPC, API
versioning, money/date migrations, CSV redesign, new product features, hosting
migration, or an observability vendor. A staging environment is deferred until
release complexity justifies it. Production observability must later add
structured redacted logs, request IDs, health/readiness endpoints, exception
reporting, auth metrics, and import metrics after hosting is decided.
