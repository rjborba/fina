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
- **Individual card**: a named physical, additional, or virtual card beneath a
  credit account. It identifies a purchase's source, not a separate account,
  bill, payment, permission boundary, or reimbursement obligation.
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

### Account institutions and issuer logos

1. **User outcome:** members identify checking accounts and credit cards by their
   financial institution's logo. Account creation asks for a bank or card issuer
   from a searchable 21-institution catalog, with an explicit `Other / not listed`
   choice. Existing accounts offer `Change institution` without renaming them.
2. **Authorization boundary:** creation remains membership-checked for the target
   group; institution changes resolve the account through active membership and
   group-scoped queries. The strict PATCH body accepts only `institutionId`, never
   a replacement group or user. Inaccessible and nonexistent accounts produce
   the same not-found response.
3. **Business rules:** an allowlisted nullable institution ID is persisted for
   both account types. Null means an explicit generic institution and never
   triggers name inference. Older clients may omit the creation field; only
   unambiguous whole-word, accent-insensitive names are inferred. A forward
   TypeORM migration backfills recognizable active and archived accounts while
   preserving names, due days, ownership, balances, imports, and transactions.
   Unknown, ambiguous, and substring-only names remain generic. Logos are bundled
   locally from institution-published artwork; no external logo-service requests
   send account or customer data. Credit cards use issuer branding, not a guessed
   card network. Branding follows account metadata into transactions, grouped
   and detailed bills, payment candidates, import history/profiles, filters, and
   selectors. A successful change invalidates all those query contexts; failed
   changes keep the existing logo and remain retryable.
   Logo wrappers are transparent, without an artificial white tile or outline.
   Plain white SVG backplates are removed while white logo details and branded
   colored shapes are preserved. Monochrome marks remain legible in dark mode.
4. **Acceptance criteria:** shared-contract tests validate the catalog and strict
   inputs; disposable PostgreSQL tests verify all 21 backfill mappings, null and
   invalid choices, active/archived records, data preservation, authorization,
   and response propagation. UI and browser journeys verify required selection,
   checking/card creation, existing-account changes, persistence after reload,
   generic fallback, and legible local assets in light/dark and mobile layouts.
5. **Non-goals:** connecting bank APIs, Open Finance consent/data access, card
   network identification, custom logo uploads, account renaming, and production
   deployment are separate work.
6. **Deployment:** `1791200000000-BankAccountInstitution` must run before the new
   API starts. It has been PostgreSQL-tested and applied to the verified local
   Supabase development database; production uses the controlled TypeORM
   migration workflow and is not modified by local development.

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

### Individual cards on a shared credit bill

1. **User outcome:** a credit account can contain multiple named cards, such as
   a member's and their spouse's cards, while retaining one combined bill and
   payment. Purchases show their card; members can filter by card and inspect
   per-card subtotals in the complete bill.
2. **Authorization boundary:** each card belongs to exactly one group and one
   credit account. Creation derives its group from a membership-scoped parent;
   card edits cannot change the parent or group. Transaction and import card
   assignments must match both the transaction's group and credit account.
   Inaccessible and nonexistent identifiers produce the same not-found result.
3. **Business rules:** cards store a nickname and optional exactly four final
   digits, never a full card number, CVV, or expiry. No ownership inference is
   made from a nickname. Existing purchases remain explicitly unidentified.
   Card archival hides new-assignment choices but retains historical attribution;
   changing card metadata never changes financial records. Clearing/changing an
   account cannot leave an incompatible card reference. Group deletion cascades
   the complete aggregate; ordinary card or account archival never deletes
   purchases. Bills, due dates, review months, payment matching, and cash-flow
   amounts remain keyed by account and bill month, never by an individual card.
   Per-card summaries include unidentified purchases, credits/refunds, counts,
   and unavailable amounts, and reconcile to the full bill independently of
   purchase filters. An explicit rounding adjustment accounts for legacy/manual
   values stored with more than two decimals; no rounding remainder is assigned
   to a card or written back to a purchase. Bill detail reads use one read-only
   repeatable-read snapshot so concurrent edits cannot be mislabeled as rounding.
   The unidentified card filter applies only to credit-account
   purchases, not to checking transactions.
   CSV imports can choose one fallback card for the file or explicitly map a
   source column's distinct values to cards. Nonempty unmapped values block
   import; blank values use the fallback, and an explicit unidentified mapping
   overrides it. Card identities are never guessed. Confirmation derives mapped
   attribution from verified source rows and checks every selected card within
   the import transaction. Optional version-1 mapping fields preserve older
   profiles; stale, archived, or foreign-account selections require correction.
4. **Acceptance criteria:** shared schemas reject unsafe metadata and malformed
   mappings. Disposable PostgreSQL tests cover group/parent denial, structural
   constraints, migration preservation, archival, hard-delete/cascade behavior,
   verified CSV attribution, and unchanged combined-bill reconciliation. UI and
   browser journeys cover two cards on one bill, manual creation/editing,
   combined CSV import, unidentified history, filters/subtotals, and persistence.
5. **Non-goals:** responsibility splits, multiple payments, separate per-card
   bills/balances/limits, bank connections, automatic card creation, and storage
   of payment credentials.
6. **Reference model:** [C6](https://www.c6bank.com.br/blog/cartao-adicional-c6-bank-tem-fatura-separada)
   combines all additional-card purchases in the titular bill while exposing
   individual-card spending views. [Itaú](https://www.itau.com.br/cartoes/servicos/cartao-adicional)
   differentiates card purchases inside one principal/additional-card statement.
   Fina follows that account/card distinction without connecting to bank APIs.
7. **Status:** implemented and verified with shared-contract and UI tests,
   disposable PostgreSQL coverage, and an isolated browser journey through two
   cards, one combined bill/payment, manual and CSV attribution, filtering,
   editing, archival, reload persistence, and light/dark/mobile layouts.
8. **Deployment:** the forward-only
   `1791300000000-IndividualCreditCards` TypeORM migration must run before the new
   API starts. It has been committed, PostgreSQL-tested, and applied to the
   verified local Supabase development database. Production is unchanged and
   uses the controlled TypeORM migration workflow.

### Credit-card bill grouping and reconciliation

1. **User outcome:** Cash flow shows one bill/payment row per credit account and bill month.
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
   Grouped checking transactions support checkbox and modifier-key bulk selection. Derived
   bill rows are navigation-only; members use Monthly review's inline mode or
   the bill detail page to edit individual credit-card purchases.
4. **Acceptance criteria:** the monthly-review inline/grouped choice persists locally;
   review totals represent the same expenses whether bills are grouped or inline.
   Filters, sorting, category chips, selection, and the category summary remain
   available in both views; the review toggle only replaces each bill row with
   that bill's transactions. Cash flow's purchase-category breakdown is explicitly
   distinct from actual payments when a reconciled bill changes. Bill detail preserves purchase date, installment,
   category editing, value, and transaction detail behavior. Its description and
   category, import-source, specific-import, and amount filters (including
   uncategorized purchases) search the complete bill
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
   payments. Transaction sorting uses an immutable ID to break equal-value ties.
   The details dialog keeps the visible transaction order from when it opens
   through category edits and refreshes, while displaying the latest record
   values. Rows removed from the filtered ledger are skipped; new rows join the
   navigation sequence when the dialog is reopened. This applies to inline
   transactions, grouped checking transactions, and bill-detail purchases.
   Changing the active group ends the open details session.
   Display opens a compact anchored panel with an ordering dropdown, a separate
   sort-direction control, and toggles for date, account, card, category, installment,
   amount, and import indicators. Changes apply immediately to inline and
   grouped ledgers and bill-detail purchases. Description and bill reconciliation
   context remain visible. Only validated property visibility booleans and a
   supported sort option are saved locally; no financial records are persisted
   by these preferences. Closing the panel or reloading preserves the choices.
   The Transactions page opens a compact searchable filter-property menu with
   adjacent hover submenus that leave the property list visible. Crossing the
   gap between menus keeps the submenu open; mouse hover does not steal focus.
   Click/tap and Enter or Right Arrow open and focus an editor. Escape closes
   the editor first and returns focus to its property, then closes the main
   picker; Left Arrow returns from non-text controls without interfering with
   input cursor keys. Below 640px, editors open below their property rather than
   beside it, and collision handling keeps them within the viewport.
   The picker provides
   category, bank-account and individual-card multiselects, imported/manual source and specific
   import selection, signed exact/minimum/maximum/inclusive-range amount filters,
   description search, and a date or review-month range editor. Multiple values
   within one property match any selected value; different properties combine
   with AND. Editable chips expose each active category, account, import, and
   amount criterion, with individual removal and a clear-all control that keeps
   the selected period. Choosing Manual clears any specific-import selection.
   Signed amounts follow the ledger convention: expenses are negative, income
   positive, and exact zero is a valid filter. Invalid or reversed amount/date
   drafts do not change the applied query. Applying a review-month range replaces
   any nonadjacent month selection with that complete inclusive span.
   Nest applies purchase filters before pagination and uses an unpaginated
   group-scoped match for grouped bills. A matching bill retains its full amount,
   purchase count, and reconciliation context; monthly-review period totals use
   matching purchases in both inline and grouped views. Cash-flow totals retain
   the full forecast bill or confirmed payment amount. Account links intersect
   selected account filters, and a conflicting selection produces an empty view.
   The Transactions page also remembers its applied text query, category IDs,
   account/card IDs, import-source/import IDs, signed amount bounds,
   and selected date/month range in this browser, separately for each signed-in
   user and active group. Versioned storage contains only these allowlisted
   filter preferences, not transaction response fields, statements, tokens, or
   signed URLs. Dates are stored as validated calendar days and restored as
   Date values before the first ledger query. Invalid saved preferences fall
   back to the current month; unavailable browser storage leaves filtering usable
   in memory. Clear controls update the saved preferences. Account links remain
   URL-controlled constraints, and bill-detail filters remain independent and reset when
   changing the active group or bill. Filters are local to this browser and do
   not sync between devices.
   Monthly review supports a nonempty selection of up to 120 calendar months,
   including nonadjacent months and selections across years. The month picker
   stays open while adding or removing months; previous/next month shifts the
   entire selection. Both transaction and bill queries filter the explicit
   review-month set before pagination or aggregation, so unselected months never
   contribute to the ledger, period totals, or category breakdown. This optional
   set is validated, deduplicated, sorted, and saved with the scoped browser
   preferences. Existing saved date ranges remain supported. Entering Monthly
   review expands both range endpoints to complete months and preserves the
   span; Cash flow uses the date range and clears the explicit month selection
   when that range is edited.
   New or explicitly edited occurrence dates use canonical UTC calendar
   storage. Legacy timestamps retain their previous server-local interpretation
   through a private storage marker; the migration never guesses missing source
   timezones or rewrites historical dates.
   Inline transactions, grouped bills, and bill-detail purchases use a shared
   div-based list with CSS Grid-aligned fields and fixed-height TanStack Virtual
   rows, with a shared buffer of 30 rows above and below the visible range,
   without HTML table markup or a TanStack Table row model. The shared
   list surface is inset 8px from both sides, has 8px rounded row states, and
   includes 48px of trailing space without changing virtual row height or count.
   A shared metadata grid is derived from the complete loaded list. Optional
   account, import, card, installment, category, and reconciliation fields keep
   the same column positions across rows, using empty noninteractive slots for
   absent values. Checking purchases do not acquire fake card attribution.
   The enabled installment column always reserves 64px, even when no loaded
   rows have installments, so filtering or different label lengths do not
   resize the column or move adjacent fields.
   Hidden properties release their columns and gaps consistently; descriptions
   retain usable width and narrow viewports scroll within the ledger.
   A one-column ARIA layout grid exposes full row counts, virtual row indexes, and transaction
   selection. Each item has one roving focusable cell and an explicit native
   details action; category controls retain their own focus and keyboard input.
   Navigation-only bill items never expose transaction selection state.
   Transaction rows reveal checkboxes on hover or keyboard focus; checked boxes
   remain visible and touch devices show them without hover. Checkboxes toggle
   independent selections without opening details, and Shift-click extends an
   inclusive range in the current ordering. Existing keyboard and modifier-key
   selection remain available. Selection is in memory only, prunes when rows
   leave a completed filtered result (not a temporary loading/error state), and
   resets on active-group changes. Select all
   includes only loaded transactions, never derived bills or unloaded query rows.
   A compact bottom bar shows the selected count, signed BRL net total, and any
   unavailable amounts. It offers select/clear, category assignment or removal,
   individual-card assignment for selections within one credit account, and
   confirmed soft deletion. Category/card assignment reuses the generated,
   authorized transaction mutation with at most eight concurrent requests;
   partial failures report success/failure counts and remain retryable rather
   than claiming an atomic bulk update. Actions and selection changes are
   disabled during bulk mutations, as are row editing and details navigation to
   avoid competing writes; successful category edits retain selection
   unless the updated rows stop matching the active filters.
4. **Acceptance criteria:** July bills appear in June review when assigned there;
   individual transaction rows show their original day, month, and year and date
   sorting follows that date, including purchases outside the selected review
   month. Grouped bills retain their assigned review-month display;
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

Browser verification also uses a unique temporary Vite dependency cache per
run, removed at shutdown, so rebuilt shared contracts cannot reuse stale
exports or invalidate an interactive development server's cache.
The linked ESM `@fina/types` workspace is excluded from Vite dependency
prebundling in both interactive and test development. Contract rebuilds must
load current workspace exports rather than a cache created before new schemas
or catalogs existed.

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
