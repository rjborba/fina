import type { CategoryColor } from "@fina/types"
import { CircleSlash2 } from "lucide-react"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { categoryColorOptions } from "@/components/categories/categoryAppearanceOptions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export function CustomValueColorSelect({
  id,
  color,
  onColorChange,
  disabled = false
}: {
  id: string
  color: CategoryColor | null
  onColorChange: (color: CategoryColor | null) => void
  disabled?: boolean
}) {
  const selectedLabel =
    categoryColorOptions.find((option) => option.value === color)?.label ??
    "No color"
  return (
    <Select
      value={color ?? "none"}
      disabled={disabled}
      onValueChange={(value) => {
        if (value === "none") onColorChange(null)
        else {
          const option = categoryColorOptions.find(
            (option) => option.value === value
          )
          if (option) onColorChange(option.value)
        }
      }}
    >
      <span id={`${id}-selection`} className="sr-only">
        {selectedLabel}
      </span>
      <SelectTrigger
        id={id}
        aria-label="Tile color"
        aria-describedby={`${id}-selection`}
        title={`Tile color: ${selectedLabel}`}
        className="w-14 shrink-0 gap-1.5 px-2 text-xs"
      >
        <SelectValue>
          <span className="flex size-4 items-center justify-center">
            {color ? (
              <CategoryAppearance color={color} className="size-3" />
            ) : (
              <CircleSlash2
                className="size-3.5 text-foreground/50"
                aria-hidden="true"
              />
            )}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="z-[80]"
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <SelectItem value="none">No color</SelectItem>
        {categoryColorOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <CategoryAppearance color={option.value} />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
