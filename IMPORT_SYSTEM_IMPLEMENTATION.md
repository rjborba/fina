# CSV import system implementation brief

## Implementation status

Implemented on 2026-09-22. The browser now owns bounded CSV decoding, structure
detection, controlled mapping, deterministic regional normalization, review,
explicit exclusions, SHA-256 hashing, profile/account suggestions, and stale
preview handling. NestJS exposes strict preview and confirmation boundaries,
revalidates membership and account scope, persists imports plus transactions and
profiles atomically, and relies on a partial PostgreSQL unique index for active
exact-file duplicate protection. Import deletion retains the established
recoverable soft-delete behavior and permits a corrected re-import.

Synthetic parser and React behavior tests plus disposable PostgreSQL migration,
authorization, rollback, race, profile, and cascade tests cover the flow. The
private reference statement was used only for a local structural verification
and was not copied, logged, or committed. A Playwright browser test remains
deferred until the repository can provision isolated Supabase Auth and database
fixtures without using development data.

## Purpose

Implement Fina's first complete account-to-CSV-import journey. A member should
be able to upload a statement from different banks and account types, let Fina
detect and normalize the file, correct uncertain detections, review every
transaction, and confirm one atomic import.

This document records settled product decisions. Implement the feature
end-to-end rather than returning another design proposal. Make reasonable
implementation decisions within these constraints, keep the scope focused, and
update this document or `PROJECT.md` if implementation evidence requires a
material correction.

Before changing code, read `AGENTS.md` and `PROJECT.md` completely. The working
tree may contain substantial unrelated user work. Preserve it and do not reset,
discard, or overwrite it.

## Reference statement

The local reference file is:

`/Users/rjborba/Downloads/Extrato-01-08-2026-a-31-08-2026-CSV.csv`

Use it for local verification only. It contains private financial information:

- Do not copy it into the repository.
- Do not include its account number, transaction descriptions, names, or raw
  rows in tests, snapshots, logs, screenshots, documentation, or tool output.
- Create a synthetic fixture with invented values that reproduces only the
  structural characteristics needed by tests.

The relevant structural facts are:

- The file is a CSV-like bank statement with a document preamble before the
  transaction table.
- Five physical lines occur before the table header, including a blank line.
- Physical line 6 contains five column headers.
- Physical line 7 is the first transaction.
- There are 27 transaction rows in this example.
- The delimiter is a semicolon.
- Dates use `DD/MM/YYYY`.
- Amounts use a decimal comma and period thousands separator.
- The useful mapping is date column to transaction date, two textual columns
  combined into description, and value column to amount.
- The running-balance column is not imported as a transaction field.

The expected experience for this file is automatic detection. The user should
not have to count lines or configure the parser before seeing a useful preview.

## Locked product decisions

### Scope

- Support CSV in this milestone. Do not add XLSX, OFX, bank integrations, or
  hardcoded Banco Inter behavior.
- Build a generic source-adapter boundary so additional formats can be added
  later without changing transaction normalization.
- Do not add tRPC or an API version prefix. Keep the NestJS REST API.
- Do not add currency conversion, cross-currency totals, or fuzzy overlapping
  date-range/transaction duplicate detection.
- Do not retain the original file or complete source rows.

### Default path

The Imports page shows import history and one `Import file` action. That action,
or dropping a CSV anywhere in the signed-in application, opens the same
full-screen workflow modal. An app-wide drop first shows a clear release target,
navigates to Imports, and loads the dropped file directly into the inferred
preview. Its happy path is:

`Upload -> inferred Review and import preview`

Do not force a separate parsing step. After local detection, go directly to the
normalized preview with the inferred filename, delimiter, encoding, header, and
data boundaries summarized above it. An `Edit file configuration` action opens
a separate large modal containing the raw line-numbered file. Use a discreet
background for the single selected header and another discreet background for
the data region. Clicking a line offers `Header`, `Data start`, and `Data end`;
changing any selection immediately recomputes the preview.

Destination selection, editable field mappings, validation, and confirmation
belong in the Review and import view. Field mappings belong in the Review table
headers so users change a source column next to the result it produces.
Low-confidence or invalid mappings are highlighted on the relevant header.

### Destination account

The user uploads the file before selecting an account. Fina then infers the
account type and suggests or preselects the destination account.

Use this priority:

1. A matching, previously successful import profile identifies the account.
2. File structure/content suggests an account type and exactly one active
   account in the current group matches.
3. Several accounts match, so show a short list.
4. No reliable match exists, so require a selection.

The selected account must remain visible and editable before confirmation.
Never silently confirm an import into an inferred account. Do not retain a full
external account number merely to perform matching.

### Correctness and atomicity

- Automatically ignore blank lines, the selected preamble, the header, repeated
  headers, and clear non-data footers.
- A transaction-like invalid row blocks confirmation until configuration is
  corrected or the user explicitly excludes that row.
- Never silently drop a transaction-like row.
- Show and require review of the excluded-row count.
- Every included row is persisted or none are persisted.
- Do not provide arbitrary editing of normalized values inside the importer in
  this milestone. Users correct parsing/mapping or edit a transaction after a
  successful import.

### Privacy and trust boundary

- Read and parse the raw file in the browser.
- Keep the dropped `File` only in an ephemeral in-memory handoff while navigating
  to Imports; never put raw file content in router history or persistent storage.
- Before parsing, enforce configured file type and file-size limits.
- Compute SHA-256 in the browser with Web Crypto where supported.
- Send normalized transactions and safe metadata to NestJS.
- Treat the browser hash as duplicate metadata, not proof of file contents.
- NestJS authoritatively revalidates authorization, the account/group
  relationship, duplicate metadata, normalized transactions, and all row
  constraints.
- Never log raw CSV content, normalized transaction descriptions, tokens,
  account identifiers from the statement, or request bodies containing
  financial data.

## Adaptive browser experience

### 1. Upload

Provide a clear drag-and-drop/file-picker surface accepting `.csv`. Validate the
extension/type, configured maximum bytes, and empty files before parsing.
Centralize limits so web and API constraints cannot drift. A reasonable initial
default is 5 MiB and 5,000 included transaction rows, but confirm it against the
current request-body configuration and expose one authoritative setting.

After selection, show the filename, size, and an option to replace the file.
Hashing and parsing should have explicit non-blocking progress states for files
large enough to make them perceptible.

### 2. Structure detection

Parse into a matrix first rather than treating the first row as headers. Retain
physical source-line numbers and stable column indexes. Do not use header text
as the only identity because headers can be blank or duplicated.

Detect:

- Encoding, at minimum UTF-8 with and without BOM, with a safe fallback for a
  common Windows-1252 statement when UTF-8 decoding fails.
- Delimiter from a bounded set such as comma, semicolon, tab, and pipe.
- Header row or explicit no-header mode.
- First and optional last data rows.
- Repeated header and empty rows.
- Candidate date and numeric formats.

Score structural consistency across several rows. The reference statement's
two-column metadata lines must not beat the five-column header followed by a
consistent five-column transaction table. Semantic aliases can improve field
suggestions, but structural detection must not depend on a particular bank or
Portuguese labels.

In the file-configuration modal, show the original file as clickable,
line-numbered text, highlight the inferred header and data region, and support:

- `Header`, replacing any previously selected header
- `Data start`
- `Data end`
- Delimiter and encoding overrides

Avoid a bare numeric `start row` input as the primary interaction. Clicking the
actual row is faster and easier to verify.

### 3. Field mapping

Use controlled mappings, not user-authored formulas or arbitrary code.

Required normalized fields:

- Date
- Amount

Supported optional fields:

- Description, composed from one or more source columns in a defined order
- Installment marker for credit-card statements
- Observation only if the current transaction contract already supports it

Supported amount modes:

1. One signed amount column
2. Separate debit and credit columns

For debit/credit mode, blank and zero handling must be explicit. Debit becomes a
negative absolute amount and credit becomes a positive absolute amount. A row
with meaningful values in both columns is invalid unless the accepted business
rule explicitly resolves it.

Normalize amount meaning throughout Fina:

- Positive means money entering the account.
- Negative means money leaving the account.

For credit-card files, use human language such as `Charges are positive in this
file` instead of `Invert value field`. Show an example transformed amount next
to the control.

The running-balance column is ignored in this milestone. Its presence can help
with structural inference, but do not persist it as a transaction field or add
balance reconciliation yet.

### 4. Regional parsing

Infer formats using multiple non-empty rows. Never rely on JavaScript
`Number(localeString)` or the built-in ambiguous `Date` parser.

Support at least:

- `DD/MM/YYYY`
- `MM/DD/YYYY`
- ISO date forms already supported by Fina
- Decimal comma with period thousands separator
- Decimal point with comma thousands separator
- Signed values and surrounding whitespace

If observed dates are ambiguous, report low confidence and require the user to
choose rather than guessing. Normalize dates and amounts deterministically.
Reject non-finite values, malformed grouping, overflow, and partial parses.

Respect the current `PROJECT.md` decision about deferred global money/date
migrations. Do not silently broaden this feature into a global schema rewrite.
Nevertheless, isolate normalization behind typed functions so moving to exact
minor-unit money and explicit date semantics will not require rewriting the UI.
Document any remaining storage limitation in `PROJECT.md`.

### 5. Mapping suggestions and profiles

Suggest mappings using normalized header aliases and sampled column types.
Suggestions must carry confidence. Never hide an uncertain guess.

After a successful import, persist a safe, group-scoped reusable profile with:

- A structural/header fingerprint that excludes customer data
- Delimiter and regional-format choices
- Field mappings and transformations
- Account association and account type
- A schema/configuration version

Match profiles by structure, not filename or hardcoded bank name. Rediscover the
header/data position every time because preamble length can change. If multiple
profiles match, use them to produce an account shortlist rather than silently
choosing one.

The exact persistence shape may follow repository conventions, but profile
lookup and mutation must be membership-authorized and group-scoped. A dedicated
profile entity is acceptable; reusing sanitized metadata from prior successful
imports is also acceptable if it provides the same behavior without exposing
removed or cross-group data.

### 6. Review

Show a normalized table with:

- Physical source-line number
- Date with its source column and date-format mapping in the header
- Description with one or more mapped source columns in the header
- Amount with signed or debit/credit mapping and numeric format in the header
- Optional installment mapping
- Status or issue

Provide filters for all rows, errors, warnings, and excluded rows. Large previews
must remain usable; paginate or virtualize instead of rendering thousands of
rows at once.

Do not render dashboard-style summary cards for included/excluded/error/warning
counts or inflow/outflow totals above the preview. Keep the review focused on
the normalized rows, row filters, selected destination, and actionable issues.

Missing or invalid date/amount is an error. A missing description may be a
visible warning rather than an error unless current domain requirements say it
must be required. Zero amounts should remain distinguishable from missing or
invalid amounts.

Selecting an issue should take the user to the relevant editable Review header,
file-structure setting, or source row. Changing any setting must recompute the
preview and invalidate prior server validation.

### 7. Confirmation and success

The Review workbench ends in a persistent action footer rather than a separate
confirmation step. Show the included transaction count and selected account
there. Keep server validation and the explicit `Import N transactions` action
together, and disable import while local or server validation is stale, pending,
or invalid.

After success:

- Show the imported transaction count.
- Offer a link to transactions filtered to that import/account.
- Save/update the reusable profile.
- Clear transient raw-file state from browser memory when practical.
- Refresh import and transaction TanStack Query caches.

Improve the import history enough to show useful safe metadata such as filename,
account, creation time, transaction count, and date range. Preserve the existing
soft-delete behavior. Do not add a recovery UI in this milestone.

## Parser and normalization architecture

Move parsing and normalization out of React components and Jotai atoms into
small pure modules with explicit inputs and outputs. Exact filenames are not
prescribed, but the responsibilities should resemble:

```text
decodeCsv(bytes) -> decoded text and encoding evidence
detectCsvStructure(text) -> ranked structure candidates and confidence
parseCsvMatrix(text, structure) -> indexed rows with physical line numbers
inferFieldMapping(rows, headers, account context) -> suggestions and confidence
normalizeImportRows(rows, mapping, formats) -> normalized rows and row issues
summarizeImport(rows) -> counts, date range, inflow, outflow
```

Keep detection evidence separate from the selected configuration. This makes it
possible to explain a guess and to recompute predictably after an override.

Each issue should have stable structured data, for example:

```ts
type ImportIssue = {
  sourceRow: number;
  field?: "date" | "description" | "amount" | "installment";
  code: string;
  message: string;
  severity: "error" | "warning";
};
```

Do not include raw source values in API error messages or logs.

## Shared contracts and REST API

Zod schemas in `@fina/types` remain authoritative. Nest validates them at
runtime and derives OpenAPI; generated client output remains the only web
transport. Never edit generated client files manually.

Create an import-specific strict normalized-row contract rather than weakening
the general transaction contract. Prefer a top-level destination `accountId` so
one import cannot mix accounts and so every row does not repeat a client-chosen
account identifier. `groupId` can remain an input for routing/authorization, but
Nest must never trust it without membership and account ownership checks. Never
accept a client-supplied `userId`.

Add a preview boundary such as:

```text
POST /imports/preview
POST /imports
```

The precise DTO names should follow current conventions. Both operations must
validate the same normalized payload. Preview performs no persistence. Confirm
revalidates rather than trusting an earlier browser result and persists the
import plus transactions in one database transaction. The client must mark its
preview stale after any file, mapping, exclusion, format, or account change.

Safe request metadata should include only what is required, such as:

- Original filename after length/control-character sanitization
- Reported file size
- SHA-256 hex digest
- Source/profile fingerprint
- Mapping/configuration schema version and sanitized configuration
- Included normalized rows with physical source-row numbers
- Excluded-row count or safe exclusion metadata without raw row contents

Preview responses should return stable row/field issues and a safe summary. Do
not echo or log full raw rows. Stable API errors continue to use `code`,
`message`, optional `details`, and a request identifier without stacks, SQL,
tokens, or internal exception text.

## Persistence and duplicate behavior

Inspect the existing entities and migration history before choosing the exact
schema. The resulting model must support:

- One group and one destination account per import
- File SHA-256 metadata
- File size
- Transaction/included/excluded counts
- Safe structural/profile metadata with a version
- Useful date-range metadata if it can be derived without duplication problems
- Existing soft deletion of the import and its transactions

Use a TypeORM migration with `synchronize: false`. Enforce exact-file duplicate
protection per group/account in PostgreSQL so concurrent confirmation requests
cannot race past an application-only check. Prefer an active-record partial
unique constraint so a deliberately removed import can be corrected and
re-imported; preserve the old record and transactions as soft-deleted. If this
changes the current wording in `PROJECT.md`, update it explicitly.

A duplicate response should be a stable conflict containing safe metadata that
lets the UI identify/link the prior active import. Do not claim that hashes
detect edited files or overlapping transactions.

All account, profile, import, and transaction access must use the shared
membership policy plus group-scoped queries. Cross-tenant attempts must fail
without revealing whether a resource or matching hash exists.

## Current implementation problems to replace

Do not preserve these behaviors merely because they exist:

- `apps/web/src/pages/Imports/Import.tsx` parses with `header: true`, assuming
  physical line 1 is the table header.
- The parser configuration atom declares separator/decimal settings that are not
  applied consistently to parsing and normalization.
- `rawEntriesToTransactions.tsx` uses JavaScript number conversion that does not
  parse locale-formatted bank amounts safely.
- Mapping and transformation throw generic render/click-time errors instead of
  producing structured preview issues.
- The UI exposes implementation language such as `Invert value field` and has
  no confidence, stale-preview, row-exclusion, or strict confirmation model.
- The current create-import request repeats `bankaccountId` inside transactions
  and does not carry the metadata needed for duplicate enforcement or reusable
  profiles.

Replace or retire obsolete import components once their callers have migrated.
Do not leave two competing import pipelines.

## Testing requirements

### Pure parser/normalizer tests

Use small synthetic fixtures and cover at least:

- A preamble, blank line, header on physical line 6, and data starting on line 7
- Semicolon-, comma-, and tab-delimited files
- UTF-8 BOM and safe encoding fallback
- Quoted delimiters, quotes, and embedded newlines supported by the CSV parser
- Blank and duplicate headers
- No-header mode
- Repeated header rows and a footer
- `DD/MM/YYYY`, `MM/DD/YYYY`, ISO dates, and ambiguous dates
- Decimal comma/period grouping and decimal point/comma grouping
- Signed single-amount mode
- Separate debit/credit mode
- Credit-card positive-charge inversion
- Multi-column description composition
- Blank, malformed, non-finite, overflow, and zero amounts
- Low-confidence detection requiring an override
- Stable physical line numbers after blank or quoted multiline records
- Excluded rows not entering the confirmation payload

Never derive a committed fixture from real names, account numbers, descriptions,
or amounts in the reference statement.

### Web behavior tests

Use Vitest for pure functions and React Testing Library for meaningful behavior:

- Dropping a file from another signed-in route navigates to Imports and opens the
  same modal with the inferred preview loaded.
- High-confidence detection keeps advanced controls collapsed.
- Low-confidence detection opens the relevant control.
- Selecting a header/data row reparses and remaps the preview.
- Suggested account selection is visible and editable.
- Multiple candidate accounts require user selection.
- Composite descriptions and amount-mode changes update the preview.
- Invalid rows block confirmation.
- Explicit exclusions are counted and reversible.
- Any input change marks server validation stale.
- Duplicate conflicts and stable API issues are understandable and actionable.

### PostgreSQL integration tests

Use uniquely named disposable local Supabase PostgreSQL databases. Prove:

- Migration up behavior and constraints
- Missing/invalid identity rejection
- Group membership and account scoping
- Client-supplied cross-group/account bypass rejection without disclosure
- Strict row validation
- Preview has no persistence side effects
- Atomic rollback when any included row or persistence step fails
- Exact duplicate blocking, including concurrent/race-safe enforcement
- The chosen re-import-after-soft-delete behavior
- Import deletion still soft-deletes its transactions
- Profile lookup cannot cross groups

Mock repositories only in narrow unit tests.

### Browser journey

Add the first focused Playwright journey when the supporting harness is ready:

1. Authenticate as a member.
2. Create/select an account.
3. Upload a synthetic statement with a preamble.
4. Observe automatic structure/format/mapping detection.
5. Review and confirm.
6. See the imported transactions only in the authorized group.

Avoid expanding unrelated screens merely to make the journey pass.

## Implementation sequence

1. Re-read repository rules/current import code and record overlapping dirty
   changes before editing.
2. Add pure CSV decoding, structure detection, mapping, normalization, summary,
   and issue types with focused tests.
3. Add/adjust authoritative Zod preview/confirmation/profile contracts in
   `@fina/types`.
4. Implement Nest preview and atomic confirmation with shared validation,
   membership/account scoping, stable errors, and duplicate conflict handling.
5. Add TypeORM migration(s), entity metadata, constraints, and PostgreSQL tests.
6. Regenerate OpenAPI and the web API client; do not edit generated files.
7. Replace the browser importer with the adaptive upload/detect/map/review flow
   and TanStack Query hooks.
8. Add parser, UI, integration, and browser-journey coverage.
9. Update `PROJECT.md` current/target/gap status and any relevant README docs.
10. Run narrow checks while iterating, then the complete `pnpm verify` gate.

Parallelize only independent work. Keep the repository buildable at coherent
checkpoints and avoid leaving generated artifacts stale.

## Acceptance criteria

The task is complete only when all of the following are true:

- The synthetic version of the reference format automatically selects its line
  6 header and line 7 data start without manual setup.
- Locale-formatted dates and amounts normalize correctly and visibly.
- A high-confidence recurring import can reach review without configuration.
- Users can correct header/data range, formats, mapping, signs, and destination
  account when detection is wrong.
- One amount column and debit/credit column pairs both work.
- Invalid included rows block confirmation with field/line-specific issues.
- Explicit exclusions are visible, reversible, and summarized.
- Nest revalidates every confirmation and persists all included transactions
  atomically.
- Exact active-file duplicates are race-safely blocked per group/account.
- Successful formats can suggest mappings/accounts on a later upload without
  hardcoding a bank.
- Raw statement contents and source rows are not persisted or logged.
- Cross-group account, import, profile, and hash access is denied without
  resource disclosure.
- Import removal retains the established recoverable soft-delete semantics.
- Generated OpenAPI/client artifacts and documentation are current.
- Relevant focused tests and `pnpm verify` pass.

## Out of scope

- XLSX, OFX, direct bank connections, or bank-specific parsers
- Original-file storage or downloads
- Fuzzy per-transaction duplicate/overlap detection
- Running-balance reconciliation
- Automatic category assignment
- Currency conversion or cross-currency summaries
- Import recovery UI
- Arbitrary formulas or code in mappings
- Broad transaction/date/money redesign beyond what is strictly required for a
  correct, isolated import implementation
