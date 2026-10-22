import type { CategoryColor } from "@fina/types"
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
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        Color
      </label>
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
        <SelectTrigger id={id} aria-label="Tile color" className="text-xs">
          <SelectValue />
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
    </div>
  )
}
