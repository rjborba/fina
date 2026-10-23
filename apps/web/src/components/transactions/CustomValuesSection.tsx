import { useId, useMemo, useState } from "react"
import {
  Columns2,
  Pencil,
  Plus,
  RectangleHorizontal,
  Trash2
} from "lucide-react"
import { ApiError } from "@/api/generated"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCustomValues } from "@/data/customValues/useCustomValues"
import {
  evaluateCustomValues,
  FormulaError,
  hasInvalidFormulaNameCharacters,
  isCustomFormulaCode,
  parseCustomFormula,
  rewriteCustomFormula,
  SaveCustomValueSchema,
  tokenizeCustomFormula,
  type CategoryOutput,
  type CustomValue,
  type CustomValueColumnSpan
} from "@fina/types"
import { FormulaInput, type FormulaOption } from "./FormulaInput"
import type { FormulaMode } from "./formulaEditor"
import { FormulaText } from "./FormulaText"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { getCategoryColorClassName } from "@/components/categories/categoryAppearanceOptions"
import { CustomValueColorSelect } from "./CustomValueColorSelect"
import type { CategoryColor } from "@fina/types"
import { cn } from "@/lib/utils"

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
})
const normalize = (name: string) => name.normalize("NFKC").trim().toLowerCase()
const EMPTY_TILES: CustomValue[] = []
function errorMessage(error: unknown) {
  if (
    error instanceof ApiError &&
    [400, 409].includes(error.status) &&
    typeof error.body === "object" &&
    error.body &&
    "message" in error.body &&
    typeof error.body.message === "string"
  )
    return error.body.message
  return "Could not save the change. Try again."
}

export function CustomValuesSection({
  groupId,
  categories,
  categoryTotals,
  totalsUnavailable = false
}: {
  groupId: string
  categories: CategoryOutput[]
  categoryTotals: Record<string, number>
  totalsUnavailable?: boolean
}) {
  const query = useCustomValues(groupId)
  const tiles = query.data ?? EMPTY_TILES
  const [editing, setEditing] = useState<{
    id?: string
    title: string
    expression: string
    color: CategoryColor | null
    columnSpan: CustomValueColumnSpan
    mode: FormulaMode
    alternateExpression?: string
  } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const formId = useId()
  const options = useMemo<FormulaOption[]>(() => {
    const references = [
      ...categories.map((category) => ({
        key: `category:${category.id}`,
        name: category.name,
        kind: "Category" as const
      })),
      ...tiles.map((tile) => ({
        key: `tile:${tile.id}`,
        name: tile.title,
        kind: "Custom tile" as const
      }))
    ]
    return references.map((reference) => ({
      ...reference,
      token:
        references.filter(
          (item) => normalize(item.name) === normalize(reference.name)
        ).length === 1 &&
        !hasInvalidFormulaNameCharacters(reference.name) &&
        !/^(category|tile):\d+$/.test(reference.name)
          ? reference.name
          : reference.key
    }))
  }, [categories, tiles])
  const results = useMemo(
    () => evaluateCustomValues(tiles, categoryTotals),
    [tiles, categoryTotals]
  )
  const pending = query.save.isPending || query.remove.isPending
  let preview: { value?: number; error?: string } | null = null
  let syntaxError = ""
  if (editing?.expression.trim()) {
    try {
      if (
        tokenizeCustomFormula(editing.expression).some(
          (token) => token.type !== "reference" && token.text.includes("@")
        )
      )
        throw new FormulaError(
          "Choose a category or custom tile from the @ suggestions."
        )
      if (editing.mode === "simple" && isCustomFormulaCode(editing.expression))
        throw new FormulaError(
          "Choose Code mode to write if / else and return statements."
        )
      if (editing.mode === "code" && !isCustomFormulaCode(editing.expression))
        throw new FormulaError("Use return to finish your code with a number.")
      parseCustomFormula(editing.expression)
      const original = tiles.find((tile) => tile.id === editing.id)
      const originalNames = original
        ? parseCustomFormula(original.expression).references
        : []
      const originalKeys = original
        ? parseCustomFormula(original.resolvedExpression).references
        : []
      const resolvedExpression = rewriteCustomFormula(
        editing.expression,
        (name) => {
          const explicit = options.find((option) => option.key === name)
          if (explicit) return explicit.key
          const matches = options.filter(
            (option) => normalize(option.name) === normalize(name)
          )
          const originalIndex = originalNames.indexOf(name)
          if (!matches.length && originalIndex >= 0)
            return originalKeys[originalIndex]
          if (matches.length !== 1)
            throw new FormulaError(
              "Choose a matching category or tile suggestion."
            )
          return matches[0].key
        }
      )
      preview = evaluateCustomValues(
        [
          ...tiles.filter((tile) => tile.id !== editing.id),
          { id: editing.id ?? "preview", resolvedExpression }
        ],
        categoryTotals
      )[editing.id ?? "preview"]
    } catch (failure) {
      syntaxError =
        failure instanceof FormulaError ? failure.message : "Invalid formula."
    }
  }
  const switchMode = (mode: FormulaMode) => {
    if (!editing || mode === editing.mode) return
    let expression = editing.alternateExpression
    if (expression === undefined) {
      if (mode === "code")
        expression = editing.expression.trim()
          ? `return ${editing.expression};`
          : ""
      else {
        const singleReturn = /^\s*return\s+([\s\S]*?);?\s*$/.exec(
          editing.expression
        )?.[1]
        expression =
          singleReturn && !isCustomFormulaCode(singleReturn) ? singleReturn : ""
      }
    }
    setError("")
    setEditing({
      ...editing,
      expression,
      mode,
      alternateExpression: editing.expression
    })
  }
  const save = async () => {
    if (!editing || pending) return
    const parsed = SaveCustomValueSchema.safeParse({
      title: editing.title,
      expression: editing.expression,
      color: editing.color,
      columnSpan: editing.columnSpan
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    if (syntaxError) {
      setError(syntaxError)
      return
    }
    setError("")
    try {
      await query.save.mutateAsync({ id: editing.id, input: parsed.data })
      setEditing(null)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }
  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className="border-t border-fina-grid"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 id={`${formId}-heading`} className="text-xs font-medium">
            Customizable Values
          </h3>
          <p className="mt-1 text-[11px] text-foreground/50">
            Shared with everyone in this workspace.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || !!editing || query.isPending || query.isError}
          onClick={() => {
            setError("")
            setDeleting(null)
            setEditing({
              title: "",
              expression: "",
              color: null,
              columnSpan: 1,
              mode: "simple"
            })
          }}
        >
          <Plus className="size-3.5" /> Add tile
        </Button>
      </div>
      {query.isPending ? (
        <p role="status" className="px-5 pb-4 text-xs text-foreground/60">
          Loading custom tiles…
        </p>
      ) : null}
      {query.isError ? (
        <div className="px-5 pb-4">
          <p role="alert" className="text-xs text-red-600">
            Could not load custom tiles.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="px-5 pb-3 text-xs text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}
      {editing ? (
        <form
          className="mx-4 mb-4 space-y-3 rounded-lg border border-fina-grid bg-fina-surface p-4"
          aria-label={editing.id ? "Edit custom tile" : "New custom tile"}
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) {
              event.stopPropagation()
              setEditing(null)
              setError("")
            }
          }}
        >
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-title`}
                className="text-xs font-medium"
              >
                Title
              </label>
              <div
                role="radiogroup"
                aria-label="Tile width"
                className="flex gap-1"
              >
                {([1, 2] as const).map((columnSpan) => {
                  const label =
                    columnSpan === 1 ? "One tile" : "Two tiles (full width)"
                  const Icon = columnSpan === 1 ? Columns2 : RectangleHorizontal
                  return (
                    <label
                      key={columnSpan}
                      title={label}
                      className="relative flex size-7 items-center justify-center rounded-md border border-transparent text-foreground/55 hover:bg-foreground/5 has-[:checked]:border-fina-violet has-[:checked]:bg-fina-violet/10 has-[:checked]:text-fina-violet has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fina-violet has-[:disabled]:opacity-50"
                    >
                      <input
                        type="radio"
                        name={`${formId}-width`}
                        value={columnSpan}
                        aria-label={label}
                        checked={editing.columnSpan === columnSpan}
                        disabled={pending}
                        onChange={() => setEditing({ ...editing, columnSpan })}
                        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
                      />
                      <Icon className="size-4" aria-hidden="true" />
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CustomValueColorSelect
                id={`${formId}-color`}
                color={editing.color}
                onColorChange={(color) => setEditing({ ...editing, color })}
                disabled={pending}
              />
              <Input
                autoFocus
                id={`${formId}-title`}
                value={editing.title}
                disabled={pending}
                maxLength={120}
                className="h-11 min-w-0 flex-1 md:h-9"
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label
                id={`${formId}-logic-label`}
                htmlFor={`${formId}-logic`}
                onClick={() =>
                  document.getElementById(`${formId}-logic`)?.focus()
                }
                className="block text-xs font-medium"
              >
                Logic
              </label>
              <div
                role="radiogroup"
                aria-label="Logic mode"
                className="flex rounded-md bg-foreground/5 p-0.5"
              >
                {(["simple", "code"] as const).map((mode) => (
                  <label
                    key={mode}
                    className="relative cursor-pointer rounded px-2.5 py-1 text-[11px] text-foreground/60 has-[:checked]:bg-fina-surface has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fina-violet has-[:disabled]:opacity-50"
                  >
                    <input
                      type="radio"
                      name={`${formId}-mode`}
                      value={mode}
                      checked={editing.mode === mode}
                      disabled={pending}
                      onChange={() => switchMode(mode)}
                      className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                    />
                    {mode === "simple" ? "Simple" : "Code"}
                  </label>
                ))}
              </div>
            </div>
            <FormulaInput
              key={`${editing.id ?? "new"}-${editing.mode}`}
              id={`${formId}-logic`}
              value={editing.expression}
              disabled={pending}
              mode={editing.mode}
              options={options.filter(
                (option) => option.key !== `tile:${editing.id}`
              )}
              onChange={(expression) => setEditing({ ...editing, expression })}
            />
            <p
              id={`${formId}-logic-help`}
              className="mt-2 text-[11px] leading-relaxed text-foreground/55"
            >
              {editing.mode === "simple"
                ? "Type @ to add category or custom-tile chips. Use + − × ÷ and parentheses; decimals use a dot. Spaces around operators are tidied automatically."
                : "Type # or @ to choose a value. Use if / else if / else, comparisons and &&, ||, !. Return a number on every path; semicolons are optional. Enter adds a line; Tab indents; Shift+Tab leaves the editor."}{" "}
              Values keep the category totals’ signs. Each mode keeps its own
              draft until you save or cancel.
            </p>
            {editing.mode === "code" ? (
              <details className="mt-2 text-[11px] text-foreground/65">
                <summary className="cursor-pointer">
                  Conditional example
                </summary>
                <div className="mt-2 rounded-md bg-fina-canvas p-3 font-mono leading-5">
                  <FormulaText
                    value={
                      "if (#value > 0) {\n  return 1\n} else {\n  return 0\n}"
                    }
                    options={[]}
                  />
                </div>
                <p className="mt-1">
                  Replace #value with a category or tile. Names with spaces use
                  #&#123;Category name&#125;.
                </p>
              </details>
            ) : null}
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-foreground/65"
          >
            {syntaxError ||
              (totalsUnavailable
                ? "Period totals are unavailable."
                : preview?.error
                  ? `Unavailable: ${preview.error}`
                  : preview?.value !== undefined
                    ? `Preview: ${money.format(preview.value)}`
                    : "Enter a formula to preview its value.")}
          </p>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="fina-primary"
              size="sm"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save tile"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setEditing(null)
                setError("")
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {!query.isPending && !query.isError && !tiles.length && !editing ? (
        <p className="px-5 pb-5 text-xs leading-relaxed text-foreground/55">
          Create a tile to calculate values from categories and other tiles for
          this period.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {tiles.map((tile) => {
          const unavailable = totalsUnavailable || !!results[tile.id]?.error
          const formattedValue = money.format(results[tile.id]?.value ?? 0)
          return (
            <article
              key={tile.id}
              aria-label={tile.title}
              className={cn(
                "@container relative flex min-h-52 min-w-0 flex-col rounded-xl border border-fina-grid bg-fina-surface p-4 shadow-fina-sm",
                tile.columnSpan === 2 && "col-span-2 min-h-56 p-5"
              )}
            >
              {tile.color ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 top-0 h-0.5 rounded-full opacity-70",
                    getCategoryColorClassName(tile.color)
                  )}
                />
              ) : null}
              <div className="flex min-h-10 min-w-0 items-start gap-2">
                {tile.color ? (
                  <CategoryAppearance
                    color={tile.color}
                    label={`Tile color: ${tile.color}`}
                    className="mt-1.5"
                  />
                ) : null}
                <h4 className="min-w-0 break-words text-[13px] font-medium leading-5">
                  {tile.title}
                </h4>
              </div>
              <div className="mb-5 mt-3">
                <div
                  role="group"
                  aria-label="Calculated value"
                  tabIndex={
                    !unavailable && formattedValue.length > 16 ? 0 : undefined
                  }
                  className={cn(
                    "fina-scrollbar max-w-full overflow-x-auto rounded-sm pb-1 font-medium leading-tight tracking-tight tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fina-violet",
                    unavailable ? "text-base" : "whitespace-nowrap"
                  )}
                  style={
                    unavailable
                      ? undefined
                      : {
                          fontSize: `clamp(0.875rem, ${100 / (formattedValue.length * 0.6)}cqi, ${tile.columnSpan === 2 ? "2.5rem" : "1.75rem"})`
                        }
                  }
                >
                  {unavailable ? "Unavailable" : formattedValue}
                </div>
                {unavailable ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-red-700 dark:text-red-300">
                    {totalsUnavailable
                      ? "Period totals are loading or incomplete."
                      : results[tile.id]?.error}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto border-t border-fina-grid pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                    Logic
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-foreground/60 hover:bg-fina-violet/10 hover:text-fina-violet"
                      disabled={pending}
                      aria-label={`Edit ${tile.title}`}
                      onClick={() => {
                        setError("")
                        setDeleting(null)
                        setEditing({
                          id: tile.id,
                          title: tile.title,
                          expression: tile.expression,
                          color: tile.color,
                          columnSpan: tile.columnSpan,
                          mode: isCustomFormulaCode(tile.expression)
                            ? "code"
                            : "simple"
                        })
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-foreground/60 hover:bg-fina-danger hover:text-red-600 dark:hover:text-red-300"
                      disabled={pending}
                      aria-label={`Delete ${tile.title}`}
                      onClick={() => {
                        setDeleting(tile.id)
                        setError("")
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 break-words font-mono text-[11px] leading-5 text-foreground [font-feature-settings:normal] [font-variant-ligatures:none]">
                  <FormulaText value={tile.expression} options={options} />
                </p>
              </div>
              {deleting === tile.id ? (
                <div className="mt-3 space-y-2 rounded-md bg-fina-canvas p-3">
                  <p className="text-xs">Delete this shared tile?</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="fina-danger"
                      size="sm"
                      disabled={pending}
                      onClick={async () => {
                        try {
                          await query.remove.mutateAsync(tile.id)
                          setDeleting(null)
                          if (editing?.id === tile.id) setEditing(null)
                        } catch (failure) {
                          setError(errorMessage(failure))
                        }
                      }}
                    >
                      Delete tile
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setDeleting(null)}
                    >
                      Keep tile
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
