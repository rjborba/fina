import { useId, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ApiError } from "@/api/generated"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCustomValues } from "@/data/customValues/useCustomValues"
import {
  evaluateCustomValues,
  FormulaError,
  hasInvalidFormulaNameCharacters,
  parseCustomFormula,
  rewriteCustomFormula,
  SaveCustomValueSchema,
  type CategoryOutput,
  type CustomValue
} from "@fina/types"
import { FormulaInput, type FormulaOption } from "./FormulaInput"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { CategoryAppearancePicker } from "@/components/categories/CategoryAppearancePicker"
import type { CategoryColor } from "@fina/types"

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
    color: CategoryColor
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
  const save = async () => {
    if (!editing || pending) return
    const parsed = SaveCustomValueSchema.safeParse({
      title: editing.title,
      expression: editing.expression,
      color: editing.color
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
            setEditing({ title: "", expression: "", color: "violet" })
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
            <label
              htmlFor={`${formId}-title`}
              className="mb-1.5 block text-xs font-medium"
            >
              Title
            </label>
            <Input
              autoFocus
              id={`${formId}-title`}
              value={editing.title}
              disabled={pending}
              maxLength={120}
              onChange={(event) =>
                setEditing({ ...editing, title: event.target.value })
              }
            />
          </div>
          <CategoryAppearancePicker
            color={editing.color}
            onColorChange={(color) => setEditing({ ...editing, color })}
            label="Tile color"
            disabled={pending}
          />
          <div>
            <label
              htmlFor={`${formId}-logic`}
              className="mb-1.5 block text-xs font-medium"
            >
              Logic
            </label>
            <FormulaInput
              id={`${formId}-logic`}
              value={editing.expression}
              disabled={pending}
              options={options.filter(
                (option) => option.key !== `tile:${editing.id}`
              )}
              onChange={(expression) => setEditing({ ...editing, expression })}
            />
            <p
              id={`${formId}-logic-help`}
              className="mt-2 text-[11px] leading-relaxed text-foreground/55"
            >
              Type {"{{"} to mention categories or custom tiles. Use + − * / and
              parentheses; decimals use a dot. Values keep the category totals’
              signs.
            </p>
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
      <div className="grid grid-cols-2 bg-fina-surface">
        {tiles.map((tile) => (
          <article
            key={tile.id}
            aria-label={tile.title}
            className="min-w-0 border-b border-r border-fina-grid p-4"
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex min-w-0 items-start gap-2">
                <CategoryAppearance
                  color={tile.color}
                  label={`Tile color: ${tile.color}`}
                  className="mt-1"
                />
                <h4 className="min-w-0 break-words text-xs font-medium">
                  {tile.title}
                </h4>
              </div>
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={pending}
                  aria-label={`Edit ${tile.title}`}
                  onClick={() => {
                    setError("")
                    setDeleting(null)
                    setEditing({
                      id: tile.id,
                      title: tile.title,
                      expression: tile.expression,
                      color: tile.color
                    })
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={pending}
                  aria-label={`Delete ${tile.title}`}
                  onClick={() => {
                    setDeleting(tile.id)
                    setError("")
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium tabular-nums">
              {totalsUnavailable || results[tile.id]?.error
                ? "Unavailable"
                : money.format(results[tile.id]?.value ?? 0)}
            </p>
            {totalsUnavailable || results[tile.id]?.error ? (
              <p className="mt-1 text-[11px] text-red-700 dark:text-red-300">
                {totalsUnavailable
                  ? "Period totals are loading or incomplete."
                  : results[tile.id]?.error}
              </p>
            ) : null}
            <p className="mt-2 break-words font-mono text-[10px] text-foreground/45">
              {tile.expression}
            </p>
            {deleting === tile.id ? (
              <div className="mt-3 space-y-2">
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
        ))}
      </div>
    </section>
  )
}
