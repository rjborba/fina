# Fina design system

Fina uses a square neo-brutalist visual language: hard black outlines, flat
high-contrast colors, offset shadows, compact uppercase labels, and direct
interaction feedback. New screens should compose the shared tokens and
primitives instead of copying hex colors or shadow values.

## Foundations

Brand tokens live in `src/index.css` and are exposed to Tailwind:

| Role                | Tailwind utility | Value     |
| ------------------- | ---------------- | --------- |
| Ink and borders     | `fina-ink`       | `#050505` |
| Page canvas         | `fina-canvas`    | `#f6f5ef` |
| Raised surface      | `fina-surface`   | `#ffffff` |
| App grid            | `fina-grid`      | `#e8e7e2` |
| Primary action      | `fina-lime`      | `#c7ff00` |
| Strong accent       | `fina-violet`    | `#7c3cff` |
| Informational hover | `fina-sky`       | `#aee8ff` |
| Warm highlight      | `fina-yellow`    | `#fff3a6` |
| Destructive action  | `fina-danger`    | `#ff6767` |

Use `shadow-fina-sm`, `shadow-fina-md`, and `shadow-fina-lg` for the standard
3px, 4px, and 6px hard shadows. Corners remain square (`--radius: 0`).

These brand tokens intentionally remain stable in dark mode. This prevents a
theme selector from changing a branded component's foreground or hover color.

## Buttons

Use the named variants from `components/ui/button.tsx`:

```tsx
<Button variant="fina-primary" lift>Save</Button>
<Button variant="fina-secondary" lift>Filter</Button>
<Button variant="fina-ghost" size="icon" aria-label="Previous month" />
<Button variant="fina-danger">Delete</Button>
```

Do not add foreground colors only for the resting state. Every interactive
variant owns both its background and foreground for rest, hover, focus, active,
and disabled states. A hover state may move or recolor a control, but it must
never become transparent or reduce text/icon contrast.

The optional `lift` prop is for controls in normal document flow. Do not apply
it to fixed, translated, or edge-mounted controls because competing transform
utilities will move those controls out of position.

## Surfaces and labels

`FinaSurface` and `FinaBadge` live in `components/ui/fina.tsx`:

```tsx
<FinaSurface tone="yellow" elevation="lg" className="p-6">
  Content
</FinaSurface>

<FinaBadge tone="lime">Ledger / 01</FinaBadge>
```

Prefer a two-pixel ink border for interactive surfaces and primary panels. Use
one-pixel dividers only inside dense tables and joined grids.

## Typography and layout

Routed screens should use `FinaPage` and `FinaPageHeader` from
`components/FinaPage.tsx`. The shared header supplies the dotted hero, section
badge, responsive title scale, description spacing, and action placement. Page
content belongs in a semantic `main` with `p-5 md:p-8`; use
`FinaSectionLabel` above major section headings.

Authentication is the exception to the routed shell, but it keeps the same
tokens, square controls, hard borders, and metadata typography. Full-screen
workflows such as statement import should also keep a visible ink divider and
brand-colored header so opening an overlay does not feel like leaving Fina.

- Use a heavy sans-serif face for page titles and values.
- Use monospace, uppercase text for metadata, labels, and table headings.
- Keep operational headers compact so the user's data remains the dominant
  part of the viewport.
- Prefer joined grids for dense financial summaries and visible borders over
  decorative whitespace.

### Dense financial rows

When every field matters but the primary text needs more horizontal room, use
a two-level row instead of wrapping the primary text. The first line contains
the primary columns (for transactions: Date, Transaction, and Value); the
second line contains visibly labeled metadata and row actions. Keep primary
descriptions on one line and allow horizontal table scrolling on narrow
viewports.

Sorting for these compound rows belongs in one visible control above the data,
not in secondary labels repeated inside every row. The control must state both
the active field and direction.

## Accessibility checklist

- Supply an `aria-label` for icon-only controls.
- Keep keyboard focus visible; do not remove the shared focus ring.
- Verify foreground and background together in every interaction state.
- Do not communicate income, expense, warning, or selection by color alone.
- Preserve reduced-motion behavior from `src/index.css`.
