import type { CategoryColor } from "@fina/types"

import { cn } from "@/lib/utils"
import { getCategoryColorClassName } from "./categoryAppearanceOptions"

export function CategoryAppearance({
  color,
  label,
  className
}: {
  color: CategoryColor
  label?: string
  className?: string
}) {
  return (
    <span
      data-category-dot
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        getCategoryColorClassName(color),
        className
      )}
    />
  )
}
