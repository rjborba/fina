# Fina product and architecture

## Purpose and users

Fina is intended for people who want to collaborate on finances inside a group
without exposing that group's data to unrelated customers. It combines group
membership, accounts, categories, CSV statement import, and transaction review.

This document distinguishes verified current behavior from the intended target.
Existing code is evidence, not an implicit specification.

## Product status

| Area                | Current                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Target                                                                                                                                                                 | Gap                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Identity            | Nest globally verifies Supabase HS256 or signing-key JWTs, validates issuer/audience/role, and attaches typed identity. Stable errors include a request ID.                                                                                                                                                                                                                                                                                                           | A typed authenticated identity is derived from every verified token.                                                                                                   | Add production observability around failures without logging tokens.                                                |
| Tenant isolation    | Every application route uses shared membership policy and group-scoped queries. Cross-tenant resource lookups return the same not-found response.                                                                                                                                                                                                                                                                                                                     | Every query and mutation is membership-checked and group-scoped without resource-existence disclosure.                                                                 | Keep PostgreSQL-backed denial tests with every new resource.                                                        |
| Roles               | Memberships have owner/member roles. Owners rename workspaces and manage invitations and group deletion; both roles manage financial data.                                                                                                                                                                                                                                                                                                                            | Owners administer groups and members; both roles manage financial data.                                                                                                | Member removal, ownership transfer, and final-owner rules still need routes.                                        |
| First-run setup     | Every Supabase Auth signup atomically creates an application profile, a `My finances` group, and an owner membership; existing profiles without any membership are backfilled by migration.                                                                                                                                                                                                                                                                           | A newly authenticated user can immediately use every group-scoped product flow.                                                                                        | Add first-run guidance to the browser experience.                                                                   |
| Accounts/categories | Nest provides group-scoped create/list/read/delete behavior; ordinary deletion archives records without changing transaction history. Credit-card accounts accept and persist a constrained due day from 1 through 31, rather than an artificial calendar date. Categories carry a validated icon and color from the product palette, with safe defaults for existing rows and older clients, and members can change existing category appearance.                    | Members manage group-scoped accounts and visually distinct categories; referenced records archive without owning transaction lifecycle.                                | Add account/category name editing and recovery UX.                                                                  |
| CSV import          | The CSV workflow validates mapping, preserves source files, rejects active duplicates, and atomically imports group-scoped transactions. Card imports choose only the bill due month. Monthly review automatically includes bills due in the following month; no review assignments are stored.                                                                                                                                                                       | Preview validated generic mapping, detect same-file duplicates, atomically persist normalized rows and the original CSV, and retain the source for audit/reprocessing. | Extend bank-format detection and original file recovery UX as needed.                                               |
| Transactions        | Monthly review calculates card attribution as the month before each bill's due month and supports inline or grouped card bills. Cash flow shows unpaid bills on their due date as forecasts and confirmed card payments once on their actual payment date and amount. Checking transactions use their occurrence month. No group defaults, bill assignments, or transaction review overrides are stored. All data remains group-scoped and ordinary deletion is soft. | Group-scoped review/editing, exact minor-unit money, explicit account currencies, explicit posting/accounting/occurrence dates, and soft deletion.                     | Add responsibility splits and settlement tracking; migrate money and currency with explicit data handling.          |
| Invitations         | Owners create/list/revoke invites; an authenticated matching email can accept once and become a member.                                                                                                                                                                                                                                                                                                                                                               | Email-bound, single-use, revocable, seven-day invitations create member memberships.                                                                                   | Add expiry and email delivery.                                                                                      |
| Group deletion      | Owner-only deletion requires typed exact-name confirmation and relies on tested aggregate cascades inside one transaction.                                                                                                                                                                                                                                                                                                                                            | Owner types the group name; one database transaction hard-deletes the tenant aggregate with tested cascades.                                                           | Add ownership-transfer/member administration before broader rollout.                                                |
| API contracts       | Zod request/safe-response DTOs generate committed OpenAPI and fetch client output; web data hooks use only that client.                                                                                                                                                                                                                                                                                                                                               | Transport-neutral Zod schemas drive validation, OpenAPI, the generated client, and TanStack Query hooks.                                                               | Extend response serialization checks as new endpoints are added.                                                    |
| Hosting             | Vercel hosts the web app. Render runs the verified Nest API with production Supabase Auth/PostgreSQL configuration and controlled TypeORM migrations. The API custom domain serves directly over TLS with explicit CORS; Render's instance tier is still free.                                                                                                                                                                                                        | Vercel serves the web app and an always-on Render web service runs Nest near PostgreSQL with explicit health and migration procedures.                                 | Verify the authenticated web journey; add an always-on instance, health checks, and an approved migration workflow. |

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
- **Card metadata**: an optional statement label and final four digits stored
  directly on a credit transaction, not a separate identity, account, bill,
  payment, permission boundary, or reimbursement obligation.
- **Bill reconciliation**: the tenant-scoped link between one derived
  credit-card bill and one checking-account payment transaction.
- **Review month**: a calculated calendar month used for household expense
  review: the month before a credit bill's due month, or a checking transaction's
  occurrence month. It is never stored or assigned independently.
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

### Workspace renaming

Owners can rename a workspace from its settings page. `PATCH /groups/:id`
accepts only a trimmed name of 1–120 characters. The shared owner policy and
owner-scoped update reject members and hide inaccessible resources. Successful
renames refresh workspace lists, selectors, headings, and deletion confirmation;
failed saves preserve the entered name for retry. No schema change is required.

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
   resulting due date for cash-flow forecasts. Monthly review automatically
   includes the bill in the preceding calendar month, without an import choice,
   stored assignment, or group default;
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
   Successful confirmation also saves the mapping in the existing group/account/
   column-layout profile, including optional card columns, date/number formats,
   and sign inversion. A later matching statement applies the destination
   account's profile automatically. With several matching accounts, choosing the
   destination applies its own profile; no account is guessed. An account without
   its own profile can reuse an unambiguous mapping from the same institution and
   account type within the active group (including C6 credit accounts). Different
   mappings require an explicit choice. Institution reuse requires matching
   normalized headers and column count; headerless formats are account-specific,
   and generic institutions never imply a shared bank format. Current-file
   delimiter, encoding, and detected boundaries are retained. A visible status
   identifies the applied mapping, edits remain possible, and late/refetched
   profiles never overwrite manual choices. Bill months, row exclusions, and
   transaction/card values are not saved in profiles. No browser-local mapping
   storage, new card entity, or database migration is needed.
4. **Acceptance criteria:** preview shows field failures; confirmation is all or
   nothing; duplicates conflict; imported transactions appear only to members;
   a browser journey and PostgreSQL integration tests prove the flow. Saved
   mapping tests cover account precedence, institution/type/layout restrictions,
   conflicts, current-file parsing, and late responses; the browser imports a
   manually mapped C6 format and reuses its persisted mapping on later statements
   and another C6 credit account.
5. **Non-goals:** bank-specific formats, overlapping-range warnings, original
   file download UX, currency conversion, and cross-currency totals.
6. **Discrepancy:** the product and API flow are implemented. Browser automation
   uses a uniquely named disposable local PostgreSQL database and a loopback-only
   identity fixture, never development or production Auth records.

### Transaction card metadata on a shared credit bill

1. **User outcome:** one credit-account CSV can contain purchases from any number
   of cards without first creating cards or mapping their identities. Optional
   card name and final-four-digit columns describe each transaction. The account
   retains one combined bill and payment.
2. **Authorization boundary:** metadata belongs to its transaction, with the same
   active-membership and group-scoped authorization. The distinct-values endpoint
   is scoped to the requested group and optional account; it never exposes another
   tenant's labels. There is no individual-card entity or CRUD API.
3. **Business rules:** transactions store nullable `cardName` and `cardLast4`
   text fields. Names are trimmed, bounded, and reject control characters and
   PAN-like digit sequences. Digits must contain exactly four ASCII digits;
   leading zeros are preserved. Never collect payment credentials or infer
   ownership from a name. Card details are allowed only on credit-account purchases.
   Ordinary account archival and import/transaction soft deletion retain metadata.
   Hard account deletion clears optional account/card attribution without deleting
   group-owned transactions.
   CSV maps `cardNameColumn` and `cardLast4Column` just like date, description,
   amount, and installment. Either column is optional. Empty cells remain null;
   explicitly masked numbers normalize to final-four text, but full numbers are
   rejected, never silently truncated. Confirmation derives these values from the
   verified file and physical source rows, not client-selected card IDs or forged
   preview values. Profiles save column choices only, with no identity mapping or
   file-wide card fallback. Historical import mappings and original files remain
   retained for audit; old profiles lose obsolete identity assignments and require
   an explicit choice of which column contains a name versus digits.
   Manual creation and same-account bulk editing use ordinary optional fields,
   with retryable errors and no separate card management. Transaction details
   display existing card attribution read-only beneath the account.
   Display controls card name and masked digits independently. The permanent card
   indicator follows the import indicator and reveals available metadata. Entirely
   unidentified credit purchases retain `Not identified`; checking rows stay blank.
   Filters and complete-bill subtotals group exact name/digit pairs, not stable card
   identities. Equal final digits with different labels remain separate, but no
   global uniqueness or cross-import identity is promised. Card filters are in
   memory only: labels/digits are never persisted in browser filter preferences,
   and obsolete saved card IDs are ignored without losing other preferences.
   Bill identity, due dates, review months, reconciliation, and cash-flow amounts
   remain keyed by account/month. Subtotals include refunds, unidentified entries,
   unavailable values, and an explicit rounding adjustment; read-only repeatable
   snapshots prevent concurrent edits being mistaken for rounding.
4. **Acceptance criteria:** shared schemas and parser/UI tests cover independent
   columns, mixed cards, empty values, leading zeros, masked digits, unsafe inputs,
   stale ID rejection, display toggles, editing, filtering, and privacy-safe
   preferences. Disposable PostgreSQL tests prove source verification, tenant
   isolation, migration preservation, constraints, combined-bill reconciliation,
   and rounding. The browser journey imports three card labels and verifies
   display, filtering, editing, reload persistence, and compact light/dark/mobile
   rendering through the real API.
5. **Non-goals:** saved-card inventory, card-wide rename/archive/unarchive,
   automatic identity matching, separate per-card bills/balances/limits,
   responsibility splits, bank connections, or payment-credential storage.
6. **Deployment:** `1792459849364-TransactionCardMetadata` copies existing names
   and last four digits from active/archived cards onto every attributed
   transaction, including soft-deleted history, before dropping the card table and
   reference column. Financial records and immutable original files are preserved.
   Independent card records not attached to transactions require a backup to
   recover. Deploy the matching API and web together; stale clients submitting
   card IDs are rejected. The migration is PostgreSQL-tested, committed, and applied to the
   verified local Supabase development database. Production is unchanged by local
   implementation.

   `1792501867419-BackfillImportedCardMetadata` is a data-only repair for retained
   historical statements with `Nome no Cartão` and `Final do Cartão` in the
   second and third columns. It verifies original CSV hashes/sizes and physical
   source rows, then fills missing card fields on active credit purchases using
   the shared metadata schemas. Existing conflicting card details, deleted
   imports/purchases, checking transactions, and unsupported layouts are left
   alone. Transaction IDs, categories, manual financial edits, source files,
   saved mappings, and reconciliation links are preserved. Invalid or ambiguous
   source rows abort the repair; concurrent card changes abort the transaction.
   The migration is idempotent and forward-only. It was applied to production
   on 2026-10-20 after disposable PostgreSQL and browser verification, enriching
   520 existing purchases while preserving every category assignment and all
   other financial/source records.

### Credit-card bill grouping and reconciliation

1. **User outcome:** Cash flow shows one bill/payment row per credit account and bill month.
   Unpaid bills are forecasts on their due date; confirmed payments appear on
   their actual date and amount. Monthly review shows individual purchases or
   one grouped bill in the calendar month preceding the bill's due month.
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
   and net totals are labeled separately; the full bill total,
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

1. **User outcome:** Monthly review automatically includes bills due in the next
   month: February bills appear in January, and January bills in the preceding
   December. Due dates and actual payments retain their real dates.
2. **Authorization boundary:** all reads require active membership and scoped
   queries. There are no review-assignment or group-default mutation routes.
3. **Business rules:** derive the review month from the bill's due month minus
   one calendar month, independently of purchase dates and confirmed payments.
   The same rule applies to historical and future bills, imports, manual entries,
   installments, credits, and empty scheduled bills. Checking transactions use
   their occurrence month with no override. Imports and manual entries choose
   only the bill due month. No group default, bill assignment, or transaction
   review-month column is stored; response review months are computed read-only
   values. Reject stale clients that submit review assignments. Transaction
   sorting uses an immutable ID to break equal-value ties.
   The details dialog keeps the visible transaction order from when it opens
   through category edits and refreshes, while displaying the latest record
   values. Rows removed from the filtered ledger are skipped; new rows join the
   navigation sequence when the dialog is reopened. This applies to inline
   transactions, grouped checking transactions, and bill-detail purchases.
   Changing the active group ends the open details session. The dialog uses a
   compact description/amount header, read-only transaction date, account and
   masked card attribution, due date, installment, source, workspace, and notes.
   Card editing, calculated/considered dates, and the duplicate header date are
   omitted. Added time appears as subdued metadata; category buttons and their
   keyboard behavior remains available. The modal omits decorative section
   badges, shortcut instructions, and navigation keycaps; it uses restrained
   typography, unboxed facts, and a quiet position counter in the footer.
   Display opens a compact anchored panel with an ordering dropdown, a separate
   sort-direction control, and toggles for date, account, card name, masked
   card number, category, installment, and amount. Account chips and masked
   card numbers are off by default. Account combines the institution icon and
   name in one outlined chip; its toggle hides or shows the entire chip and
   column in inline, grouped, and bill-detail lists. The renamed Account option
   preserves the existing saved account-name visibility choice. Import and credit-card
   indicators are always visible when applicable; the credit-card icon follows the import
   icon and reveals the transaction's card label and optional final four digits on hover
   or keyboard focus. Unidentified credit-card
   purchases show `Not identified` when Card name is enabled, with an explanatory
   icon tooltip rather than a guessed card identity. Checking rows have no card label.
   Import and card indicators sit directly after the description, in that order,
   without placeholder gaps for inapplicable icons. The account icon is never
   separated from its chip's name. Categories use
   outlined rounded chips with a colored dot and name, not pictograms. Category
   creation and editing offer a color picker and chip preview; legacy icon
   metadata remains API-compatible but is not displayed or configurable. New
   categories use the existing safe icon default, and color edits preserve
   legacy icon metadata. Uncategorized rows show a muted, outlined `Uncategorized`
   chip without a colored dot; clicking or keyboard-activating it opens the category
   picker. Hiding Category removes its whole chip, picker, and column. Hiding
   Account removes both its icon and name; card-text toggles do not hide the
   permanent credit-card indicator.
   These hover targets use an ordinary cursor, not a question mark. The number
   option displays only masked final four digits, never a full payment number.
   Obsolete saved account/import icon flags are ignored while supported sorting
   and visibility choices remain preserved. Changes apply immediately to inline and
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
   category, bank-account and transaction-card-value multiselects, imported/manual source and specific
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
   account IDs, import-source/import IDs, signed amount bounds,
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
   account chip, card name/number, installment, category, and reconciliation fields keep
   the same column positions across rows, using empty noninteractive slots for
   absent values. Checking purchases do not acquire fake card attribution.
   Descriptions stay left-aligned and take the flexible width. The remaining
   text fields form a compact right-anchored block, with their contents aligned to
   each column's end without changing positions for absent values.
   Rows use 8px column gaps and an 80px date column to keep dates close to their
   descriptions. The enabled installment column always reserves 40px, even when no loaded
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
   card-detail editing for selections within one credit account, and
   confirmed soft deletion. Category/card assignment reuses the generated,
   authorized transaction mutation with at most eight concurrent requests;
   partial failures report success/failure counts and remain retryable rather
   than claiming an atomic bulk update. Actions and selection changes are
   disabled during bulk mutations, as are row editing and details navigation to
   avoid competing writes; successful category edits retain selection
   unless the updated rows stop matching the active filters.
4. **Acceptance criteria:** July bills automatically appear in June review;
   individual transaction rows show their original day, month, and year and date
   sorting follows that date, including purchases outside the selected review
   month. Grouped bills show their calculated review month. January-to-December
   rollover, leap months, nonadjacent selections, concurrent imports, checking
   occurrence dates, authorization, and metadata removal without rewriting
   financial/source records are covered with disposable PostgreSQL tests. The
   browser journey proves due-month-only imports and both ledger views through
   the real API.
5. **Non-goals:** expense responsibility splits, reimbursement balances, and
   closing/locking a reviewed month are a subsequent increment.
6. **Deployment:** `1792034936757-DeriveMonthlyReview` is a forward-only migration
   removing only obsolete review metadata. Deploy the matching API and web code
   together; the old API depends on the removed fields. Existing financial dates,
   values, attribution, source files, soft-deletion flags, and reconciliation
   records are preserved. The migration is PostgreSQL-tested, committed, and
   applied to the verified local Supabase development database. Production is
   unchanged by local implementation.

### Workspace customizable summary values

Period summary includes **Customizable Values** below its category breakdown.
Every active workspace member can create, edit and delete shared tiles; owners
have no exclusive editing capability. Definitions are persisted in the workspace,
not browser storage. The client refreshes shared definitions on focus and every
15 seconds while the panel is open. Closing the panel discards unsaved drafts.

Tiles have a workspace-shared color from the existing category palette, shown
as a dot beside the title. The editor allows choosing/changing this color;
new and existing tiles default to violet. Colors are validated by the shared
contract and a PostgreSQL constraint. Older clients that omit color preserve
an existing tile's color when editing instead of resetting it.

Each tile has a shared width setting: **One tile** (one column, the default) or
**Two tiles (full width)** (both columns of the summary grid). Members can choose
it on creation and change it in the editor. Grid order stays unchanged; a wide
tile starts on a new row if needed. The setting persists across reloads and is
shared with workspace members, including on mobile. Older clients that omit
`columnSpan` preserve an existing width; only numeric 1 or 2 are accepted by the
shared contract and PostgreSQL constraint.

Each tile has a unique 1–120 character title and arithmetic logic using decimal
numbers (dot separator), `+`, `-`, `*`, `/`, unary signs, parentheses and
`{{Category name}}` / `{{Custom tile title}}` references. Typing `{{` opens a
searchable, keyboard-accessible reference list including both kinds. References
are bound to workspace-scoped IDs on save, so tile renames do not break dependent
formulas. Duplicate or reserved category names use explicit `{{category:ID}}`
tokens; archived category references retain their attribution. New titles cannot
collide with existing category or tile names (case/Unicode-normalized).
Autocomplete always moves the caret past both closing braces, including when
reselecting an unchanged reference, so closing a surrounding parenthesis or
continuing an expression cannot split the reference's braces.

Tiles calculate from the same signed category totals used in the displayed
period summary, including its period and filters, not from bill payments or an
independent responsibility/settlement ledger. They never mutate transactions.
The UI previews calculations and marks values unavailable while source totals
are loading, failed or incomplete (including the ledger pagination limit).
Division by zero, non-finite/oversized results and unavailable dependencies show
an error, never Infinity/NaN or a fabricated zero. Errors propagate to dependent
tiles. Syntax errors, unresolved/ambiguous names and direct/indirect cycles are
rejected on save. Runtime arithmetic errors can be saved because a formula may
be valid in another period. JavaScript, functions and arbitrary code are never
executed. Limit each workspace to 100 tiles and each formula to 256 tokens,
32 nesting levels and 16,000 characters.

The Nest API exposes membership-checked `/groups/:groupId/custom-values` CRUD
through generated clients and strict shared Zod contracts. Writes lock the
workspace row for the short transaction, serializing graph validation with
updates/deletions so simultaneous edits cannot introduce cycles. Last successful
write wins for ordinary concurrent edits. Delete requires confirmation and is
blocked while another tile references it. Workspace deletion cascades all tile
definitions atomically. Public Data API roles have no table or sequence grants;
the existing Nest-only authorization boundary is preserved, without adding RLS.

Deployment requires TypeORM migration `1792620000000-WorkspaceCustomValues`
before the matching API/web deployment. Verification uses disposable local
PostgreSQL databases. The migration is also applied to the verified local
development database; production is unchanged.

Tile colors additionally require `1792668625989-CustomValueColors` before the
matching API deployment. It adds only the constrained color/default and leaves
existing formulas, titles, ownership and financial records unchanged. It is
PostgreSQL-tested and applied locally; production remains unchanged.

Tile widths require `1792669875893-CustomValueWidth` before the matching API
deployment. The migration defaults existing tiles to one column without
changing definitions, colors or financial records. Verification uses disposable
local PostgreSQL databases. It is also applied to the verified local development
database; production remains unchanged.

### Transaction notes

The existing nullable `observation` field is displayed as Note. A comment icon
replaces the flag control on transaction rows, including grouped checking rows
and bill purchases. Clicking it opens a text editor dialog with Save note and
Cancel; Ctrl/Cmd+Enter saves and Escape cancels. Existing comments also offer
a trash icon to remove the saved note directly. Nonblank notes highlight the
comment icon and row yellow in light/dark mode. Clearing a note clears the
highlight. Hovering a highlighted row or its comment icon shows the saved
comment in a wrapped tooltip. Bill aggregates have no comment control. Details show the full note
and allow editing using the same field. Failed saves retain the draft for retry;
empty notes clear to null. Note controls do not open transaction details or
trigger navigation/category shortcuts. Notes use the existing authenticated,
group-scoped transaction PATCH and query cache; no new schema or API field is
needed. The earlier `flagged` column remains backward-compatible but does not
control the interface highlight. Migration
`1792503000000-TransactionFlags` was applied to production on 2026-10-20;
the non-null boolean/default and migration history were verified, with no
pending migrations remaining.

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
