import type { CategoryColor } from "@fina/types"
import { cn } from "@/lib/utils"
import { CategoryAppearance } from "./CategoryAppearance"

export function CategoryChip({
  name,
  color,
  className
}: {
  name: string
  color?: CategoryColor
  className?: string
}) {
  return (
    <span
      data-category-chip
      data-category-placeholder={!color || undefined}
      className={cn(
        "inline-flex h-6 max-w-full min-w-0 items-center gap-2 rounded-full border border-foreground/10 bg-transparent px-2.5 text-xs font-normal text-foreground/60",
        !color && "text-foreground/35",
        className
      )}
    >
      {color ? <CategoryAppearance color={color} /> : null}
      <span className="truncate">{name}</span>
    </span>
  )
}
