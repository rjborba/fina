import type { CategoryOutputDto } from "@/api/generated"
import type { CategoryColor, CategoryIcon } from "@fina/types"
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
import { CategoryAppearance } from "./CategoryAppearance"
import { CategoryAppearancePicker } from "./CategoryAppearancePicker"

export function EditCategoryAppearanceDialog({
  category
}: {
  category: CategoryOutputDto
}) {
  const { updateCategoryAppearance } = useCategoriesMutation()
  const [open, setOpen] = useState(false)
  const [icon, setIcon] = useState<CategoryIcon>(category.icon)
  const [color, setColor] = useState<CategoryColor>(category.color)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setIcon(category.icon)
      setColor(category.color)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateCategoryAppearance(category.id, { icon, color })
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
      <DialogContent className="rounded-none border-2 border-fina-ink bg-fina-surface shadow-fina-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase">
            <CategoryAppearance icon={icon} color={color} />
            {category.name}
          </DialogTitle>
          <DialogDescription>
            Choose how this category appears throughout your workspace.
          </DialogDescription>
        </DialogHeader>

        <CategoryAppearancePicker
          icon={icon}
          color={color}
          onIconChange={setIcon}
          onColorChange={setColor}
        />

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
