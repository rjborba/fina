import type { CategoryColor, CategoryIcon } from "@fina/types"

import { cn } from "@/lib/utils"
import { CategoryAppearance } from "./CategoryAppearance"
import {
  categoryColorOptions,
  categoryIconOptions
} from "./categoryAppearanceOptions"

export function CategoryAppearancePicker({
  icon,
  color,
  onIconChange,
  onColorChange
}: {
  icon: CategoryIcon
  color: CategoryColor
  onIconChange: (icon: CategoryIcon) => void
  onColorChange: (color: CategoryColor) => void
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          Icon
        </legend>
        <div
          role="radiogroup"
          aria-label="Category icon"
          className="grid grid-cols-6 gap-2"
        >
          {categoryIconOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={icon === option.value}
              aria-label={`Icon ${index + 1}`}
              title={`Icon ${index + 1}`}
              onClick={() => onIconChange(option.value)}
              className={cn(
                "flex aspect-square items-center justify-center border-2 border-fina-ink bg-fina-surface p-1 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fina-violet",
                icon === option.value
                  ? "-translate-y-0.5 shadow-fina-sm"
                  : "opacity-65 hover:opacity-100"
              )}
            >
              <CategoryAppearance
                icon={option.value}
                color={color}
                className="size-8 border"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.16em]">
          Color
        </legend>
        <div
          role="radiogroup"
          aria-label="Category color"
          className="grid grid-cols-6 gap-2"
        >
          {categoryColorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={color === option.value}
              aria-label={option.label}
              title={option.label}
              onClick={() => onColorChange(option.value)}
              className={cn(
                "flex h-10 items-center justify-center border-2 border-fina-ink bg-fina-surface transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fina-violet",
                color === option.value
                  ? "-translate-y-0.5 shadow-fina-sm"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <CategoryAppearance
                icon={icon}
                color={option.value}
                className="size-7 border"
              />
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
