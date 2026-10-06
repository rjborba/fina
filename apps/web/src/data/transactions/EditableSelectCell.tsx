import { FC, useEffect, useState } from "react"
import type { CategoryOutput } from "@fina/types"

import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { getCategoryColorClassName } from "@/components/categories/categoryAppearanceOptions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const NONE_CATEGORY_ID = "none" as const

interface EditableSelectProps {
  value: string | null
  options: Array<Pick<CategoryOutput, "id" | "name" | "icon" | "color">>
  open: boolean
  ariaLabel: string
  onOpenChange: (open: boolean) => void
  onChange: (value: string | null) => Promise<unknown>
}

export const EditableSelect: FC<EditableSelectProps> = ({
  value,
  options,
  onChange,
  open,
  ariaLabel,
  onOpenChange
}) => {
  const [internalValue, setInternalValue] = useState(value)

  const selectedOption = options.find(
    (option) => String(option.id) === String(internalValue)
  )

  const displayText = selectedOption?.name || "Uncategorized"

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  return (
    <Select
      open={open}
      onOpenChange={onOpenChange}
      value={internalValue ? String(internalValue) : NONE_CATEGORY_ID}
      onValueChange={(newValue) => {
        const normalizedNewValue =
          newValue === NONE_CATEGORY_ID ? null : newValue

        setInternalValue(normalizedNewValue)
        onOpenChange(false)

        onChange(normalizedNewValue).catch(() => {
          toast({ title: "Something went wrong", variant: "destructive" })
          setInternalValue(value)
        })
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-7 w-auto min-w-0 cursor-pointer rounded-full border border-fina-ink px-2 py-0 font-mono text-[10px] font-black shadow-none focus:ring-2 focus:ring-fina-violet [&>svg]:hidden",
          selectedOption
            ? getCategoryColorClassName(selectedOption.color)
            : "bg-fina-yellow text-fina-ink"
        )}
      >
        <SelectValue>
          <span className="flex min-w-0 items-center gap-1.5">
            {selectedOption ? (
              <CategoryAppearance
                icon={selectedOption.icon}
                color={selectedOption.color}
                className="size-5 border-0 bg-transparent text-current"
              />
            ) : null}
            <span className="truncate">{displayText}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-none border-2 border-fina-ink shadow-fina-sm">
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            <span className="flex items-center gap-2">
              <CategoryAppearance
                icon={option.icon}
                color={option.color}
                className="size-6 border"
              />
              {option.name || "-"}
            </span>
          </SelectItem>
        ))}
        <SelectItem value={NONE_CATEGORY_ID}>Uncategorized</SelectItem>
      </SelectContent>
    </Select>
  )
}
