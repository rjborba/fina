import type { CategoryColor } from "@fina/types"
import { useId } from "react"

import { cn } from "@/lib/utils"
import { CategoryAppearance } from "./CategoryAppearance"
import { categoryColorOptions } from "./categoryAppearanceOptions"

export function CategoryAppearancePicker({
  color,
  onColorChange
}: {
  color: CategoryColor
  onColorChange: (color: CategoryColor) => void
}) {
  const colorGroupId = useId()

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-mono text-[10px] font-semibold tracking-[0.16em]">
          Color
        </legend>
        <div
          role="radiogroup"
          aria-label="Category color"
          className="grid grid-cols-6 gap-2"
        >
          {categoryColorOptions.map((option) => (
            <label
              key={option.value}
              title={option.label}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-md border bg-transparent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fina-violet",
                color === option.value
                  ? "border-fina-violet bg-fina-violet/5"
                  : "border-transparent hover:bg-foreground/5"
              )}
            >
              <input
                type="radio"
                name={colorGroupId}
                value={option.value}
                checked={color === option.value}
                aria-label={option.label}
                onChange={() => onColorChange(option.value)}
                className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
              />
              <CategoryAppearance color={option.value} className="size-3" />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
