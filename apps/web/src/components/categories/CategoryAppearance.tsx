import type { CategoryColor, CategoryIcon } from "@fina/types"

import { cn } from "@/lib/utils"
import {
  categoryIconMap,
  getCategoryColorClassName
} from "./categoryAppearanceOptions"

export function CategoryAppearance({
  icon,
  color,
  label,
  className
}: {
  icon: CategoryIcon
  color: CategoryColor
  label?: string
  className?: string
}) {
  const Icon = categoryIconMap[icon]

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center border-2 border-fina-ink",
        getCategoryColorClassName(color),
        className
      )}
    >
      <Icon className="size-4" strokeWidth={2.5} />
    </span>
  )
}
