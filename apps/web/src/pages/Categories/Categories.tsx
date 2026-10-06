import { zodResolver } from "@hookform/resolvers/zod"
import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_ICON_VALUES,
  type CategoryColor,
  type CategoryIcon
} from "@fina/types"
import { Plus, Tag, Trash2 } from "lucide-react"
import { type FC } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
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
  icon: z.enum(CATEGORY_ICON_VALUES),
  color: z.enum(CATEGORY_COLOR_VALUES)
})

type CategoryFormData = {
  categoryName: string
  icon: CategoryIcon
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
      icon: "tag",
      color: "yellow"
    }
  })
  const selectedIcon = form.watch("icon")
  const selectedColor = form.watch("color")

  const onSubmit = async (values: CategoryFormData) => {
    if (!selectedGroup?.id) {
      throw new Error("Selected group not found")
    }

    await addCategory({
      name: values.categoryName,
      icon: values.icon,
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
        title="Name every move."
        description="Build a focused set of labels for the active workspace, then assign them directly from the transaction ledger."
        actions={
          <FinaBadge tone="yellow">
            {categoryData?.length ?? 0} labels
          </FinaBadge>
        }
      />

      <main className="grid gap-8 p-5 lg:grid-cols-[minmax(20rem,0.65fr)_minmax(0,1.35fr)] lg:items-start md:p-8">
        <FinaSurface tone="sky" elevation="lg" className="p-5 sm:p-6">
          <FinaSectionLabel>New / Label</FinaSectionLabel>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
            Add category
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-fina-ink/65">
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
                    <FormLabel className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                      Category name
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 rounded-none border-2 border-fina-ink bg-fina-surface font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
                        placeholder="e.g. Groceries"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CategoryAppearancePicker
                icon={selectedIcon}
                color={selectedColor}
                onIconChange={(icon) => form.setValue("icon", icon)}
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
              className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
            >
              Existing categories
            </h2>
          </div>

          <FinaSurface elevation="md" className="overflow-hidden">
            {categoryData?.length ? (
              <ul className="grid divide-y-2 divide-fina-ink sm:grid-cols-2 sm:divide-y-0">
                {categoryData.map((category, index) => (
                  <li
                    key={category.id}
                    className="flex min-h-24 items-center justify-between gap-3 border-b-2 border-fina-ink p-4 odd:sm:border-r-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <CategoryAppearance
                        icon={category.icon}
                        color={category.color}
                        label={`${category.name} category appearance`}
                        className="size-10"
                      />
                      <div className="min-w-0">
                        <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/45">
                          / {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="truncate font-black">
                          {category.name}
                        </div>
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
                <p className="mt-4 font-black uppercase">No categories yet</p>
                <p className="mt-2 text-sm font-medium text-fina-ink/60">
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
