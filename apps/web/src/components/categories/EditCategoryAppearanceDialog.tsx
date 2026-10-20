import type { CategoryOutputDto } from "@/api/generated"
import type { CategoryColor } from "@fina/types"
import { Palette } from "lucide-react"
import { useState } from "react"

import { useCategoriesMutation } from "@/data/categories/useCategoriesMutation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { CategoryChip } from "./CategoryChip"
import { CategoryAppearancePicker } from "./CategoryAppearancePicker"

export function EditCategoryAppearanceDialog({
  category
}: {
  category: CategoryOutputDto
}) {
  const { updateCategoryAppearance } = useCategoriesMutation()
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState<CategoryColor>(category.color)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setColor(category.color)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateCategoryAppearance(category.id, {
        icon: category.icon,
        color
      })
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="fina-ghost"
          size="icon"
          aria-label={`Edit ${category.name} appearance`}
        >
          <Palette />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-md border border-fina-grid bg-fina-surface shadow-fina-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <CategoryChip name={category.name} color={color} />
          </DialogTitle>
          <DialogDescription>
            Choose the dot color for this category throughout your workspace.
          </DialogDescription>
        </DialogHeader>

        <CategoryAppearancePicker color={color} onColorChange={setColor} />

        <DialogFooter>
          <Button
            type="button"
            variant="fina-primary"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Saving…" : "Save appearance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
