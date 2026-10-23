import { useTranslation } from "react-i18next"
import { FC, useEffect, useState } from "react"
import type { CategoryOutput } from "@fina/types"

import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { CategoryChip } from "@/components/categories/CategoryChip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const NONE_CATEGORY_ID = "none" as const

interface EditableSelectProps {
  value: string | null
  options: Array<Pick<CategoryOutput, "id" | "name" | "icon" | "color">>
  open: boolean
  ariaLabel: string
  onOpenChange: (open: boolean) => void
  onChange: (value: string | null) => Promise<unknown>
  disabled?: boolean
}

export const EditableSelect: FC<EditableSelectProps> = ({
  value,
  options,
  onChange,
  open,
  ariaLabel,
  onOpenChange,
  disabled = false
}) => {
  const { t } = useTranslation()

  const [internalValue, setInternalValue] = useState(value)

  const selectedOption = options.find(
    (option) => String(option.id) === String(internalValue)
  )

  const displayText = selectedOption?.name || t("Uncategorized")

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  useEffect(() => {
    if (disabled && open) onOpenChange(false)
  }, [disabled, open, onOpenChange])

  return (
    <Select
      disabled={disabled}
      open={open && !disabled}
      onOpenChange={onOpenChange}
      value={internalValue ? String(internalValue) : NONE_CATEGORY_ID}
      onValueChange={(newValue) => {
        if (disabled) return
        const normalizedNewValue =
          newValue === NONE_CATEGORY_ID ? null : newValue

        setInternalValue(normalizedNewValue)
        onOpenChange(false)

        onChange(normalizedNewValue).catch(() => {
          toast({ title: t("Something went wrong"), variant: "destructive" })
          setInternalValue(value)
        })
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        title={displayText}
        className="h-6 w-auto max-w-full min-w-0 cursor-pointer justify-end rounded-full border-0 bg-transparent p-0 text-right text-xs font-normal text-muted-foreground shadow-none hover:bg-fina-canvas focus:ring-1 focus:ring-fina-violet [&>svg]:hidden"
      >
        <SelectValue className="min-w-0 max-w-full">
          <CategoryChip name={displayText} color={selectedOption?.color} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-md border border-fina-grid shadow-fina-sm">
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            <span className="flex items-center gap-2">
              <CategoryAppearance color={option.color} />
              {option.name || "-"}
            </span>
          </SelectItem>
        ))}
        <SelectItem value={NONE_CATEGORY_ID}>{t("Uncategorized")}</SelectItem>
      </SelectContent>
    </Select>
  )
}
