# Fina design system

Fina uses a calm, compact product interface inspired by Linear: neutral layered
surfaces, hairline separators, restrained indigo accents, clear type hierarchy,
and dense controls that keep financial data in focus. Decoration must never
compete with balances, transactions, or review actions.

## Foundations

Brand tokens live in `src/index.css` and are exposed to Tailwind. Legacy token
names remain stable so feature code can move to the new system incrementally.

| Role                  | Tailwind utility | Purpose                         |
| --------------------- | ---------------- | ------------------------------- |
| Primary text          | `foreground`     | Headings and high-emphasis text |
| Dark surface          | `fina-ink`       | High-contrast summary fills     |
| Page canvas           | `fina-canvas`    | Quiet application background    |
| Raised surface        | `fina-surface`   | Panels, menus, and inputs       |
| Separators            | `fina-grid`      | Hairline borders and dividers   |
| Soft selected state   | `fina-lime`      | Selection and subtle emphasis   |
| Primary accent        | `fina-violet`    | Primary actions and focus       |
| Informational tint    | `fina-sky`       | Informational icon backgrounds  |
| Secondary accent tint | `fina-yellow`    | Supporting icon backgrounds     |
| Destructive tint      | `fina-danger`    | Error and destructive surfaces  |

Use `shadow-fina-sm`, `shadow-fina-md`, and `shadow-fina-lg` sparingly. They
are soft elevation layers, not structural outlines. Standard controls use an
8px radius and one-pixel borders.

Dark mode uses `#0A0B0B` for the navigation sidebar and `#121212` for the page
canvas and flat transaction lists, including their headers and empty, loading,
and error states. Raised panels, menus, and dialogs retain their separate
neutral surfaces; light-mode colors remain unchanged.

## Buttons

Use the named variants from `components/ui/button.tsx`:

```tsx
<Button variant="fina-primary">Save</Button>
<Button variant="fina-secondary">Filter</Button>
<Button variant="fina-ghost" size="icon" aria-label="Previous month" />
<Button variant="fina-danger">Delete</Button>
```

Primary actions use the indigo accent. Secondary actions use a white surface
and quiet border. Avoid movement on hover; communicate state with background,
border, and foreground changes. Icon-only controls require an `aria-label`.

## Surfaces and labels

`FinaSurface` and `FinaBadge` live in `components/ui/fina.tsx`:

```tsx
<FinaSurface elevation="sm" className="p-6">
  Content
</FinaSurface>

<FinaBadge>Ledger</FinaBadge>
```

Use a one-pixel neutral border for panels. Colored tones are reserved for small
status or icon treatments; large content areas should stay neutral.

Tooltips are compact rounded labels without arrows, diamonds, or decorative
pointers. Keep their accessible descriptions and hover/keyboard-focus behavior.

## Typography and layout

### Financial institution identity

Use `FinancialInstitutionLogo` for actual bank-account and credit-card issuer
identity. The 21 local assets retain institution-published colors and proportions;
render them on transparent wrappers without an added tile or outline. Remove
plain white SVG backplates, not white logo details or branded colored shapes.
Keep monochrome C6/Safra marks readable with light ink in dark mode; invert only
the black-and-white XP mark while preserving its internal contrast. Use
44px marks in the Accounts registry, 24px in the searchable institution picker,
and 14–20px in compact selectors and ledger metadata without changing 40px rows.
Hide decorative duplicates from assistive technology; standalone marks have
institution-specific alternative text. Keep account-type labels/tooltips and
use the existing bank/card glyph when the institution is unknown or explicitly
Other. Generic navigation and account-type controls remain generic.

The creation form requires an explicit institution or `Other / not listed`
choice, labeled `Financial institution` for checking accounts and `Card issuer`
for cards. `Change institution` opens a focused editor for existing accounts.
The picker supports keyboard search (including accent-free institution names),
retains the chosen logo/name on its trigger, and uses the same compact neutral
popover surfaces as the rest of the application. No remote logo-service URLs or
customer fields are stored in asset metadata.

### Individual cards on a shared bill

Under a credit account, use the compact `Cards` disclosure to manage named cards.
Each card has a nickname and optional last four digits, displayed as
`Mine · ••4242`; never collect a full card number, CVV, or expiry. Card labels
identify purchases, not separate accounts or financial responsibility. Archived
cards retain their historical labels and badge but are unavailable for new
assignment.

Use the searchable `CardPicker` in manual creation and purchase details. Show
`Not identified` explicitly when no card is known; never infer attribution from
account names. Card metadata remains optional and follows the existing compact
13px/12px ledger typography without changing row height. Display can hide the
card label independently from account identity. The Card filter is a searchable
multiselect using the existing hover submenu styles; include historical cards
and `Not identified` credit purchases. Persist only selected card IDs in scoped
filter preferences.

Bill detail shows `Cards in this bill` with each card's count and signed net
subtotal, including refunds and unidentified purchases. These always represent
the complete shared bill, even when clicking a subtotal filters the purchase
list. Keep the bill, due day, review month and payment controls combined. Show
unavailable-amount context and any explicit subtotal rounding adjustment rather
than assigning a remainder to a card.

The selection bar offers Card assignment only when all selected purchases belong
to one credit account. Support assigning or clearing a card, retain successful
selection, report partial failures, and disable competing editing/navigation
while saves run. CSV import supports a file-wide fallback and explicit mappings
from distinct source-column values. Blank values use the fallback; explicit
`Not identified` mappings override it. Unmapped nonempty values block import.
Keep attribution visible in preview before confirmation, with one combined bill
and no automatic guessing or card creation.

Routed screens use `FinaPage` and `FinaPageHeader`. Headers are compact so data
appears high in the viewport. Use sentence case for page and section titles.

- Use semibold sans-serif type for headings and important values.
- Use regular or medium sans-serif type for metadata and table headings.
- Keep operational headers compact. Data views use 14px page titles; reserve
  larger headings for overview or onboarding screens.
- Use whitespace, subtle surface changes, and hairline separators for grouping.
- Prefer dense tables and rows for financial data; avoid oversized cards.

### Transactions list

Transactions use a headerless, dividerless div-based list with CSS Grid-aligned
date, description, category, and amount fields. Inline transactions, grouped
bills, and bill-detail purchases share virtualized list primitives instead of
HTML table markup or a TanStack Table row model. A one-column ARIA layout grid
exposes interactive items and selection to assistive technology; each item has
one roving focusable gridcell, an explicit native open-details button, and
separate category controls. Navigation-only bill items omit selection state.

- Use 40px fixed-height rows, 24px inner horizontal insets, 13px description text, and
  12px metadata. Every field stays on one line and truncates rather than wraps.
  Inset the shared list 8px from each side of its scroll container. Give row
  hover, selection, and focus backgrounds 8px corners, including the focused
  checkbox edge, without clipping controls or changing row stride. Keep 48px
  of trailing space after the last row even when nothing is selected; this
  footer extends the virtual list's surface, not its row count. Selection-bar
  clearance remains additional. An outer sizing box keeps the right gutter
  reachable when a narrow viewport requires horizontal scrolling.
  Derive one shared metadata grid from the complete loaded list, not each row
  or the currently rendered virtual slice. Keep description, account/import
  icons, account name, card, installment, category, and reconciliation fields
  aligned regardless of missing values or label length. Missing values retain
  empty, non-focusable, accessibility-hidden slots; checking purchases never
  receive fake card labels. Checking-only lists do not reserve a card column,
  and hiding a property removes its track and gap from every row together.
  Description fields retain at least 120px. Use 14px icon tracks, a 96px desktop
  account track, 176px card track, and 128px category track. Card labels preserve
  the archived badge and expose their full text in the native title; installment
  tracks always reserve 64px while enabled, including lists with no installments,
  so filtering or changing label length cannot shift neighboring fields. Longer
  values truncate with their full text in the native title. Grouped bills
  have an independent 128px reconciliation track even when Category is hidden;
  payment-only status tracks remain desktop-only at 80px. Bill counts truncate
  within the description field before squeezing its open action below 48px.
- Keep the 48px page header and 44px toolbar quiet, with a 14px page title and
  28px controls. Do not add an activity heading or explanatory subtitle.
- Use a neutral row hover and a subtle indigo keyboard/selection state. Avoid
  cell borders, row dividers, table headings, card outlines, or shadows.
- Reveal a 14px rounded checkbox in the existing 24px leading inset on row hover
  or focus within, without shifting columns. Keep checked boxes visible; coarse
  pointers and devices without hover show checkboxes at rest. Use a 24px by 40px
  target and let Space toggle the focused checkbox without opening details.
  Plain clicks accumulate selections; Shift-click selects an inclusive ordered
  range. Derived bill summaries have no checkbox.
- Show a floating selection bar only while transactions are selected. Center
  it over the ledger, accounting for the desktop sidebar, with 28px controls,
  8px padding, a 44px desktop height, pill corners, quiet borders, and layered
  soft shadows. Use 12px selected-count text, 13px actions, near-white light
  surfaces, and a `#1a1a1c` dark surface. Wrap into a rounded panel within the
  mobile viewport. Show count, signed net total, and unavailable-amount context
  in a separate live status; keep actionable controls in a labeled toolbar.
  Offer Select all (loaded transactions), Unselect all, searchable Category
  (including None), eligible Card assignment, and confirmed Delete. Disable selection, actions, row editing,
  and details navigation while mutations run; leave failed operations retryable.
  Preserve selection through filter loading/error states, pruning only the
  completed result, and hide the bar until its context is available. Reserve scroll clearance
  below rows so the bar does not hide the last items.
- Keep the existing TanStack virtualizer. Its estimate and rendered row height
  must both remain 40px; constrain the scroll container to the viewport. The
  Transactions page fills its available height; standalone bill-detail lists
  retain a viewport-height bound instead of growing to render every row.
  All ledger views share an overscan buffer of 30 rows above and below the
  visible range (1,200px on either side) to prepare upcoming rows while scrolling.
- Expose the complete row count and each virtual item's one-based row index.
  Keep focus on the active item's gridcell as it scrolls into view. Editors,
  metadata controls, and dialogs retain their own keyboard behavior.
- Put filtering in a small anchored popover with a searchable property menu.
  Hover Category, Bank account, Card, Import source, Amount, Date range, or Description
  to open an adjacent submenu while keeping the property list visible. Use a
  216px main menu, 256–288px editors, 36px search headers, 32px option rows,
  13px regular text, 14px icons, 4px list insets, and 12px rounded popup corners.
  Shared filter styles use a half-pixel neutral border, layered soft shadow,
  near-white light surfaces, and `#202023` dark surfaces with quiet `#2a2a2e`
  hover states. Keep these styles scoped to filter menus and chip editors.
  Leave a 6px gap and retain hover briefly while crossing it; hover must not steal
  focus. Click/tap, Enter, and Right Arrow open and focus the editor. Escape
  closes the submenu first and returns to its property; Left Arrow returns from
  non-text controls without hijacking caret navigation. Flip or clamp popups to
  stay inside the viewport; below 640px, open the editor below its property with
  end alignment rather than forcing two side-by-side menus.
  Category/account choices are searchable multiselects; source
  offers Imported, Manual, or individual source files. Amount supports exact,
  between, at least, and at most with signed values and inclusive bounds. Date
  ranges use calendar days in Cash flow and complete months in Monthly review.
  Show editable category/account/card/import/amount chips next to Filter; each has its
  own remove button. Clear filters keeps the period. Closing the popover preserves
  the latest typed description even before its debounce finishes. Find-in-view
  search appears beside Display.
- Remember applied Transactions-page text/category/account/card/source/amount
  filters and the selected month or date range across reloads. Use versioned,
  validated browser storage
  scoped to the signed-in user and active workspace, with calendar-day dates
  hydrated before queries render. Clear actions save the cleared preferences;
  unavailable or malformed storage must not break filtering. Store only the
  text query, category/account/card/import IDs, source choice, numeric amount bounds,
  and date range, never transaction records or tokens.
  Existing ledger view, inline-card, ordering, and property preferences still
  persist; account links stay URL-controlled constraints and bill-detail filters
  independent. Grouped bill amounts remain full; filtered monthly-review totals
  reflect matching purchases just like the inline view. Cash flow retains the
  whole bill forecast or confirmed payment.
- Put ordering, visible properties, and the monthly review inline-card preference
  inside Display. Use an anchored popover approximately 304px wide with a compact
  ordering select and a separate ascending/descending direction button. Property
  controls use subtle background or border changes for keyboard focus, without
  an outer focus ring. Property
  chips control Date, Account, Card, Category, Installment, Amount, and Import;
  selections update monthly review, cash flow, and bill-detail purchase lists
  immediately. Description remains visible, and bill reconciliation statuses
  remain available as essential context. Persist only sort and boolean property
  preferences locally; never store transaction data with these preferences.
  Keep date/month navigation and period totals in the same compact toolbar.
  Cash-flow ranges spanning multiple months show both endpoints and retain
  their span when navigating; only a single complete month uses a month label.
  Monthly review opens a compact year-and-month popover with independently
  selectable month buttons. Keep the popover open while toggling months, expose
  selection through `aria-pressed` and a checkmark, and retain at least one
  month. Year controls preserve selections in other years. The toolbar shows
  one month or the selected-month count; its previous/next buttons shift the
  complete selection while preserving gaps. Save only the validated month IDs
  with the user's workspace-scoped filter preferences.

Shortcuts follow Linear's list conventions where the current product supports
them: `C` creates, `F` filters, `Shift V` opens Display, `Cmd/Ctrl F` searches the
current view, arrows or `J/K` move, `Enter` opens, `X` toggles selection,
`Shift` plus arrows extends selection, `Cmd/Ctrl A` selects transactions, and
`Esc` clears or closes. `?` opens the shortcut reference. Editable fields,
menus, and dialogs retain their own keyboard behavior. Derived bills remain
navigation-only and cannot be selected as individual transactions. Hover then
`X` selects the hovered transaction without moving keyboard focus; list
navigation returns selection shortcuts to the keyboard-highlighted row.

The private Linear workspace was inspected directly on 2026-10-11. Its
anchored Display panel, ordering dropdown, separate direction control, and
property chips inform these controls. The dimensions above remain the current
Fina design specification, rather than exact measurements of Linear. Keyboard
and filter conventions also draw on Linear's public documentation. Its searchable
filter-property menu and adjacent checkbox submenu were measured directly:
13px regular type, 32px options, 36px search headers, 12px popup radii, quiet
neutral colors, and hairline borders inform Fina's filter picker and condition
chip editors. Fina's wider editors accommodate financial ranges and import names.
Linear's checked-row affordance and 44px floating selection pill also inform the
selection controls; Fina exposes financial context and its supported actions
directly instead of adding a general-purpose command menu.

Deferred parity: URL-backed/shared filters and saved views, advanced filter
operators, arbitrary grouping, manual row ordering,
and a global command/context menu. These need separate product work; they are
not presented as available controls.

## Accessibility checklist

- Supply an `aria-label` for icon-only controls.
- Keep keyboard focus visible with the control's focus ring, background, or
  border treatment; Display controls use subtle background and border changes.
- Verify foreground and background together in every interaction state.
- Do not communicate income, expense, warning, or selection by color alone.
- Preserve reduced-motion behavior from `src/index.css`.
