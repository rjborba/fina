import { zodResolver } from "@hookform/resolvers/zod"
import { CATEGORY_COLOR_VALUES, type CategoryColor } from "@fina/types"
import { Plus, Tag, Trash2 } from "lucide-react"
import { type FC } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { CategoryChip } from "@/components/categories/CategoryChip"
import { CategoryAppearancePicker } from "@/components/categories/CategoryAppearancePicker"
import { EditCategoryAppearanceDialog } from "@/components/categories/EditCategoryAppearanceDialog"
import { Button } from "@/components/ui/button"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useCategoriesMutation } from "@/data/categories/useCategoriesMutation"

const formSchema = z.object({
  categoryName: z.string().trim().min(1, "Category name is required").max(120),
  color: z.enum(CATEGORY_COLOR_VALUES)
})

type CategoryFormData = {
  categoryName: string
  color: CategoryColor
}

export const Categories: FC = () => {
  const { selectedGroup } = useActiveGroup()
  const { addCategory, removeCategory } = useCategoriesMutation()
  const { data: categoryData } = useCategories({
    groupId: selectedGroup?.id?.toString()
  })

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryName: "",
      color: "yellow"
    }
  })
  const categoryName = form.watch("categoryName")
  const selectedColor = form.watch("color")

  const onSubmit = async (values: CategoryFormData) => {
    if (!selectedGroup?.id) {
      throw new Error("Selected group not found")
    }

    await addCategory({
      name: values.categoryName,
      icon: "tag",
      color: values.color,
      groupId: selectedGroup.id.toString()
    })
    form.reset()
  }

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Categories"
        marker="04"
        title="Categories"
        description="Build a focused set of labels for the active workspace, then assign them directly from the transaction ledger."
        actions={
          <FinaBadge tone="yellow">
            {categoryData?.length ?? 0} labels
          </FinaBadge>
        }
      />

      <main className="grid gap-8 p-5 lg:grid-cols-[minmax(20rem,0.65fr)_minmax(0,1.35fr)] lg:items-start md:p-8">
        <FinaSurface elevation="sm" className="p-5 sm:p-6">
          <FinaSectionLabel>New / Label</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            Add category
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-foreground/65">
            Keep names short and recognizable in the transaction table.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[10px] font-semibold tracking-[0.16em]">
                      Category name
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-md border border-fina-grid bg-fina-surface font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
                        placeholder="e.g. Groceries"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div
                aria-label="Category preview"
                className="flex min-h-8 items-center"
              >
                <CategoryChip
                  name={categoryName.trim() || "Category"}
                  color={selectedColor}
                />
              </div>
              <CategoryAppearancePicker
                color={selectedColor}
                onColorChange={(color) => form.setValue("color", color)}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                variant="fina-primary"
                lift
                className="w-full"
              >
                <Plus />
                {form.formState.isSubmitting ? "Adding…" : "Add category"}
              </Button>
            </form>
          </Form>
        </FinaSurface>

        <section aria-labelledby="category-list-title">
          <div className="mb-4">
            <FinaSectionLabel>Registry / Available</FinaSectionLabel>
            <h2
              id="category-list-title"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
            >
              Existing categories
            </h2>
          </div>

          <FinaSurface elevation="md" className="overflow-hidden">
            {categoryData?.length ? (
              <ul className="grid divide-y divide-fina-grid sm:grid-cols-2 sm:divide-y-0">
                {categoryData.map((category, index) => (
                  <li
                    key={category.id}
                    className="flex min-h-24 items-center justify-between gap-3 border-b border-fina-grid p-4 odd:sm:border-r"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-foreground/45">
                          / {String(index + 1).padStart(2, "0")}
                        </div>
                        <CategoryChip
                          name={category.name}
                          color={category.color}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <EditCategoryAppearanceDialog category={category} />
                      <Button
                        variant="fina-ghost"
                        size="icon"
                        aria-label={`Remove ${category.name}`}
                        onClick={() => removeCategory(category.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-10 text-center">
                <Tag className="mx-auto size-9" />
                <p className="mt-4 font-semibold">No categories yet</p>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Add a label to begin organizing transactions.
                </p>
              </div>
            )}
          </FinaSurface>
        </section>
      </main>
    </FinaPage>
  )
}
