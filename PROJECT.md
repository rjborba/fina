# Fina product and architecture

## Purpose and users

Fina is intended for people who want to collaborate on finances inside a group
without exposing that group's data to unrelated customers. It combines group
membership, accounts, categories, CSV statement import, and transaction review.

This document distinguishes verified current behavior from the intended target.
Existing code is evidence, not an implicit specification.

## Product status

| Area                | Current                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Target                                                                                                                                                                 | Gap                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Identity            | Nest globally verifies Supabase HS256 or signing-key JWTs, validates issuer/audience/role, and attaches typed identity. Stable errors include a request ID.                                                                                                                                                                                                                                                                                                                                     | A typed authenticated identity is derived from every verified token.                                                                                                   | Add production observability around failures without logging tokens.                                                |
| Tenant isolation    | Every application route uses shared membership policy and group-scoped queries. Cross-tenant resource lookups return the same not-found response.                                                                                                                                                                                                                                                                                                                                               | Every query and mutation is membership-checked and group-scoped without resource-existence disclosure.                                                                 | Keep PostgreSQL-backed denial tests with every new resource.                                                        |
| Roles               | Memberships have owner/member roles. Owners manage invitations and group deletion; both roles manage financial data.                                                                                                                                                                                                                                                                                                                                                                            | Owners administer groups and members; both roles manage financial data.                                                                                                | Member removal, ownership transfer, and final-owner rules still need routes.                                        |
| First-run setup     | Every Supabase Auth signup atomically creates an application profile, a `My finances` group, and an owner membership; existing profiles without any membership are backfilled by migration.                                                                                                                                                                                                                                                                                                     | A newly authenticated user can immediately use every group-scoped product flow.                                                                                        | Add first-run guidance and group renaming to the browser experience.                                                |
| Accounts/categories | Nest provides group-scoped create/list/read/delete behavior; ordinary deletion archives records without changing transaction history. Credit-card accounts accept and persist a constrained due day from 1 through 31, rather than an artificial calendar date. Categories carry a validated icon and color from the product palette, with safe defaults for existing rows and older clients, and members can change existing category appearance.                                              | Members manage group-scoped accounts and visually distinct categories; referenced records archive without owning transaction lifecycle.                                | Add account/category name editing and recovery UX.                                                                  |
| CSV import          | The CSV workflow validates mapping, preserves source files, rejects active duplicates, and atomically imports group-scoped transactions. Card imports choose the bill due month separately from a persisted monthly-review month. Existing bills retain their saved reference month; conflicting import assignments fail atomically.                                                                                                                                                            | Preview validated generic mapping, detect same-file duplicates, atomically persist normalized rows and the original CSV, and retain the source for audit/reprocessing. | Extend bank-format detection and original file recovery UX as needed.                                               |
| Transactions        | Monthly review filters purchases by a saved reference month and supports inline or grouped card bills. Cash flow shows unpaid bills on their due date as forecasts and confirmed card payments once on their actual payment date and amount. Group preferences apply to new bills, while bill-level reassignment moves every purchase together without changing original dates. Checking expenses can override their review month. All data remains group-scoped and ordinary deletion is soft. | Group-scoped review/editing, exact minor-unit money, explicit account currencies, explicit posting/accounting/occurrence dates, and soft deletion.                     | Add responsibility splits and settlement tracking; migrate money and currency with explicit data handling.          |
| Invitations         | Owners create/list/revoke invites; an authenticated matching email can accept once and become a member.                                                                                                                                                                                                                                                                                                                                                                                         | Email-bound, single-use, revocable, seven-day invitations create member memberships.                                                                                   | Add expiry and email delivery.                                                                                      |
| Group deletion      | Owner-only deletion requires typed exact-name confirmation and relies on tested aggregate cascades inside one transaction.                                                                                                                                                                                                                                                                                                                                                                      | Owner types the group name; one database transaction hard-deletes the tenant aggregate with tested cascades.                                                           | Add ownership-transfer/member administration before broader rollout.                                                |
| API contracts       | Zod request/safe-response DTOs generate committed OpenAPI and fetch client output; web data hooks use only that client.                                                                                                                                                                                                                                                                                                                                                                         | Transport-neutral Zod schemas drive validation, OpenAPI, the generated client, and TanStack Query hooks.                                                               | Extend response serialization checks as new endpoints are added.                                                    |
| Hosting             | Vercel hosts the web app. Render runs the verified Nest API with production Supabase Auth/PostgreSQL configuration and controlled TypeORM migrations. The API custom domain serves directly over TLS with explicit CORS; Render's instance tier is still free.                                                                                                                                                                                                                                  | Vercel serves the web app and an always-on Render web service runs Nest near PostgreSQL with explicit health and migration procedures.                                 | Verify the authenticated web journey; add an always-on instance, health checks, and an approved migration workflow. |

## Domain glossary

- **Group**: the absolute tenant, ownership, and authorization boundary.
- **Membership**: an active relationship between one authenticated user and one
  group, with an `owner` or `member` role.
- **Account**: a financial account owned by one group, with one ISO 4217
  currency and account-level timezone in the target model.
- **Category**: a group-owned classification applied to transactions.
- **Import**: one confirmed source file, its original immutable CSV bytes,
  normalized mapping, and derived transaction metadata.
- **Transaction**: a group-owned financial record, optionally created by an
  import, soft-deleted during ordinary removal.
- **Credit-card bill**: a derived aggregate for one credit account and bill
  month, whose concrete due date is derived from that account's configured due
  day.
- **Bill reconciliation**: the tenant-scoped link between one derived
  credit-card bill and one checking-account payment transaction.
- **Review month**: an explicit calendar month used for household expense
  review, independent of purchase, due, and payment dates. Card purchases inherit
  one persisted assignment for the whole bill.
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
- Transaction amounts will use integer minor units and use the attributed
  account's currency when an account is present.
  No initial currency conversion or cross-currency totals are allowed.
- `occurredAt`, `postedDate`, `accountingDate`, and UTC `createdAt` represent
  different meanings. A source time without a zone uses the account timezone.

## Active milestone

The backend-only data boundary is implemented: typed authentication identity,
group-scoped NestJS authorization, a forward-only schema migration, generated
web transport, and PostgreSQL-backed migration/authorization tests.

The account-to-CSV-import product journey includes pure parser, React behavior,
disposable PostgreSQL boundary coverage, and an isolated Playwright journey
through login, account creation, CSV import, monthly review, and cash flow.
Production observability around authentication and import failures remains.

## Feature contracts

### Group collaboration and membership

1. **User outcome:** people collaborate inside a named financial group.
2. **Authorization boundary:** active membership permits reads; owner-only
   operations administer the group and membership.
3. **Business rules:** roles are `owner` and `member`; members cannot elevate
   themselves or invite; every new account receives a `My finances` group and
   owner membership; the final owner transfers ownership before leaving.
4. **Acceptance criteria:** role capabilities and cross-tenant denial are proven
   with PostgreSQL-backed tests; inaccessible resources are not disclosed.
5. **Non-goals:** RLS and public API versioning are not part of this milestone.
6. **Discrepancy:** initial group provisioning and membership/owner enforcement
   exist; membership removal, ownership transfer, final-owner protection, and
   first-run guidance remain.

### CSV statement import

1. **User outcome:** a member maps, previews, validates, and confirms a generic
   CSV statement into one account.
2. **Authorization boundary:** the user must be an active member of the account's
   group; all account, import, and transaction IDs are tenant-scoped server-side.
3. **Business rules:** validate CSV type and configured size before parsing;
   normalize against a strict schema; one invalid row rejects the atomic import;
   require members to enter the bill month for credit-card imports, combine it
   with the account due day instead of trusting file metadata, and use the
   resulting due date for cash-flow forecasts. A separate review month is saved
   once for the bill, using an explicit choice or the group's default. Imports
   into an existing bill reuse its saved month; a conflicting explicit choice
   fails atomically and directs the member to change the whole bill;
   in signed-amount mode, `chargesPositive` means invert every sign: positive
   charges become negative and negative credits/refunds become positive. With
   inversion disabled, source signs are preserved; separate debit/credit columns
   retain their existing convention. Nest derives inverted amounts from the
   verified CSV and physical source rows at confirmation, including requests
   from older browser tabs. The source-backed correction migration updates legacy
   amounts only when they still match the old calculation, preserves manual
   amount overrides and soft deletion, and refreshes original-import totals;
   verify size and SHA-256 from the uploaded bytes in Nest; identical hash is
   blocked per group/account; retain the immutable original CSV in PostgreSQL
   with the import while never exposing it in ordinary response contracts.
4. **Acceptance criteria:** preview shows field failures; confirmation is all or
   nothing; duplicates conflict; imported transactions appear only to members;
   a browser journey and PostgreSQL integration tests prove the flow.
5. **Non-goals:** bank-specific formats, overlapping-range warnings, original
   file download UX, currency conversion, and cross-currency totals.
6. **Discrepancy:** the product and API flow are implemented. Browser automation
   uses a uniquely named disposable local PostgreSQL database and a loopback-only
   identity fixture, never development or production Auth records.

### Credit-card bill grouping and reconciliation

1. **User outcome:** Cash flow shows one bill/payment row per card and bill month.
   Unpaid bills are forecasts on their due date; confirmed payments appear on
   their actual date and amount. Monthly review shows individual purchases or
   one grouped bill using the bill's independently assigned reference month.
2. **Authorization boundary:** bill aggregates, detail, candidates, and payment
   links are group-scoped and require active membership; cross-tenant requests
   return the standard non-disclosing not-found response.
3. **Business rules:** bill rows are derived rather than persisted. Each active
   credit-card account contributes one bill on every configured due date from
   its creation date forward, including an `empty` zero-total bill when the
   month has no transactions; empty bills require no reconciliation. Historical
   transaction-backed bills remain available and preserve their original due
   month as bill identity. Grouped and child rows never coexist. Credits/refunds reduce the net bill,
   including to zero. Reconciliation links one active checking
   transaction whose absolute amount exactly matches the current bill and whose
   effective date is within ten days of the due date. The user must confirm the
   suggested link. Both views exclude the standalone linked payment to prevent
   double counting. Cash flow uses the confirmed payment amount while monthly
   review uses the current net purchase amount. A subsequent
   bill-total change keeps the link, marks the bill `needs-review`, and continues
   excluding the linked payment until the user unlinks it.
   Grouped checking transactions retain modifier-key bulk selection. Derived
   bill rows are navigation-only; members use Monthly review's inline mode or
   the bill detail page to edit individual credit-card purchases.
4. **Acceptance criteria:** the monthly-review inline/grouped choice persists locally;
   review totals represent the same expenses whether bills are grouped or inline.
   Filters, sorting, category chips, selection, and the category summary remain
   available in both views; the review toggle only replaces each bill row with
   that bill's transactions. Cash flow's purchase-category breakdown is explicitly
   distinct from actual payments when a reconciled bill changes. Bill detail preserves purchase date, installment,
   category editing, value, and transaction detail behavior. Its description and
   category filters (including uncategorized purchases) search the complete bill
   independently of the Transactions page's filters. Filtered purchase counts
   and net totals are labeled separately; the full bill total, review month,
   payment link, and reconciliation candidates are never narrowed by filters.
   Filters reset when changing the active group or bill. PostgreSQL tests
   prove tenant isolation, suggestion, reconciliation, review, unlinking,
   migration, and aggregate cascade behavior.
5. **Non-goals:** split/partial/multiple payments, statement-file bill records,
   automatic reconciliation without confirmation, and cross-currency matching.
6. **Discrepancy:** all current accounts are treated as the product's implicit
   BRL currency. Explicit account currency must precede any multi-currency bill
   or reconciliation behavior.

### Household monthly review

1. **User outcome:** a July credit-card bill can belong to June's household
   review while its due date and actual payment remain in their real months.
2. **Authorization boundary:** active members may reassign bill or checking
   reference months; only group owners may change the shared default.
3. **Business rules:** group defaults are the bill's due month or the preceding
   month. Existing bills are backfilled to their original due month, and changing
   the default never rewrites persisted history. One assignment applies to all
   imports and manual purchases in a bill, including installments and credits.
   Checking transactions use their occurrence month unless explicitly overridden.
   Month assignment is independent of transaction/category edits and confirmed
   payments. New or explicitly edited occurrence dates use canonical UTC calendar
   storage. Legacy timestamps retain their previous server-local interpretation
   through a private storage marker; the migration never guesses missing source
   timezones or rewrites historical dates.
4. **Acceptance criteria:** July bills appear in June review when assigned there;
   January-to-December defaults, conflicting/concurrent imports, checking
   overrides, historical stability, authorization, migration, and cascade behavior
   are covered with disposable PostgreSQL tests. The browser journey proves the
   separate import choices and both ledger views through the real API.
5. **Non-goals:** expense responsibility splits, reimbursement balances, and
   closing/locking a reviewed month are a subsequent increment.

### Transaction and import deletion

1. **User outcome:** users can remove mistaken data without silently losing the
   recoverability expected for ordinary financial edits.
2. **Authorization boundary:** active group membership is required.
3. **Business rules:** transaction deletion is soft; deleting one import
   soft-deletes its transactions and retains its original CSV; referenced
   accounts/categories archive without changing transaction history. The group
   is the transaction owner; account, import, and category references are
   optional attribution and never cascade-delete transactions.
4. **Acceptance criteria:** default queries omit soft-deleted rows and tests can
   recover them; import deletion leaves the original file and related
   transactions recoverable.
5. **Non-goals:** a user-facing recovery workflow in the first import milestone.
6. **Discrepancy:** ordinary transaction/import deletion and account/category
   archival are implemented; recovery UX is not.

### Group deletion

1. **User outcome:** an owner can permanently delete a group with clear intent.
2. **Authorization boundary:** owner only.
3. **Business rules:** the owner types the exact group name; deletion is an
   immediate, single database transaction covering the complete tenant aggregate.
4. **Acceptance criteria:** transactions, accounts, categories, imports,
   original import files, invitations, and memberships are gone; any failure
   rolls everything back; foreign-key cascades are explicitly tested.
5. **Non-goals:** delayed deletion or a recovery window.
6. **Discrepancy:** implemented and PostgreSQL-tested; no recovery window is
   planned.

## Architecture

The pnpm/Turborepo monorepo contains a React/Vite browser app, a separate NestJS
REST API, and `@fina/types`. Supabase remains the identity provider. NestJS owns
application authorization and PostgreSQL access through TypeORM. Zod schemas in
the shared package are the authoritative transport contracts; entities remain
API-private. OpenAPI and the generated web client are outputs. The client wraps
generated operations in TanStack Query hooks.

TypeORM migrations are the only supported production schema-change mechanism;
synchronization stays disabled. Automated integration tests use uniquely named,
disposable databases inside the local Supabase PostgreSQL server and never a
hosted or shared database.

Interactive development uses the repository-root local Supabase stack for both
Auth and PostgreSQL. The web and API receive generated ignored local
configuration, and TypeORM applies the same migration history used in
production. Automated tests remain isolated from development data: each run
creates and drops its own database while using locally signed JWT fixtures for
deterministic authorization scenarios.

Production uses Vercel only for the static Vite application. The browser's API
origin is `https://api.fina.rjborba.com`, which resolves to the Render `fina-api`
web service. Nest runs there as a conventional long-running Node process using
`pnpm start:prod`; the repository intentionally has no Vercel Function adapter
for the API.

## Architecture decisions

| Decision                               | Rationale                                                                                                                                                                  | Status                | Revisit trigger                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Separate NestJS REST API               | Existing controller/service/guard/Swagger boundary is substantial; changing transport does not solve authorization.                                                        | Accepted              | REST creates demonstrated maintenance cost after the secure import milestone and Fina remains browser/TypeScript-only.  |
| Backend-only application authorization | One Nest policy and group-scoped repositories provide a single understandable boundary. Data API grants, legacy policies, and helper objects are removed; RLS is disabled. | Accepted; implemented | A non-Nest consumer requires database access, or a tested defense-in-depth RLS design is funded.                        |
| PostgreSQL import-file retention       | Original CSVs are capped at 5 MB and a one-to-one `bytea` row lets files, imports, and transactions share one authorization, transaction, backup, and deletion boundary.   | Accepted; implemented | File volume materially inflates database/WAL/backups, limits increase, or direct download/streaming becomes important.  |
| Zod contracts generate OpenAPI/client  | Keeps runtime validation and TypeScript clients aligned; `@hey-api/openapi-ts` 0.84.0 supports Node 24.21 and produces a self-contained fetch client.                      | Accepted; generated   | Generated output stops fitting TanStack Query wrappers or a later compatible generator materially improves maintenance. |
| No API version prefix                  | Only one coupled browser client exists.                                                                                                                                    | Accepted              | Second independently deployed client, public API, integration, or compatibility promise.                                |
| Vercel web + Render API                | Vite fits Vercel's static hosting model; Nest, TypeORM pooling, imports, and future background work fit a conventional Render web service.                                 | Accepted              | Render no longer meets reliability, regional, operational, or cost requirements.                                        |
| Secretlint 13.0.5                      | Node-based, reproducibly pinned, broad recommended rules, and masked findings by default.                                                                                  | Accepted              | Material false positives, missed supported credential types, or maintenance failure.                                    |
| RuleSync 16.39.1                       | Supports the confirmed `codexcli` and `claudecode` targets and strict drift checking on Node 24.                                                                           | Accepted              | Target incompatibility or breaking upgrade requirement.                                                                 |

## Non-goals and deferred decisions

RLS, tRPC, API versioning, global money/date migrations, and an observability
vendor are deferred. Import values
remain stored in the existing floating-point transaction column and imported
dates in the existing timestamp/date fields; normalization is isolated so the
planned exact minor-unit and explicit-date migration does not require rewriting
the importer. A staging
environment is deferred until release complexity justifies it. Production
observability must later add structured redacted logs, health/readiness
endpoints, exception reporting, auth metrics, and import metrics after hosting
is decided.
