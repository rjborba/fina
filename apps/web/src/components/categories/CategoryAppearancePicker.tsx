import { useTranslation } from "react-i18next"
import { translate } from "@/i18n"
import type { CategoryColor } from "@fina/types"
import { useId } from "react"

import { cn } from "@/lib/utils"
import { CategoryAppearance } from "./CategoryAppearance"
import { categoryColorOptions } from "./categoryAppearanceOptions"

export function CategoryAppearancePicker({
  color,
  onColorChange,
  label = translate("Category color"),
  disabled = false
}: {
  color: CategoryColor
  onColorChange: (color: CategoryColor) => void
  label?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()

  const colorGroupId = useId()

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled}>
        <legend className="mb-2 font-mono text-[10px] font-semibold tracking-[0.16em]">
          {t("Color")}
        </legend>
        <div
          role="radiogroup"
          aria-label={label}
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
        >
          {categoryColorOptions.map((option) => (
            <label
              key={option.value}
              title={t(option.label)}
              className={cn(
                "relative flex h-11 items-center justify-center rounded-md border bg-transparent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-fina-violet sm:h-9",
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
                aria-label={t(option.label)}
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
