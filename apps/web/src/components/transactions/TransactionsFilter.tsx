import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { cn } from "@/lib/utils"
import { useAtom } from "jotai"
import { FC, useEffect, useState } from "react"

import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDebounce } from "@/components/ui/multipleselector"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "../ui/skeleton"
import { Button } from "../ui/button"
import { RotateCcw, X } from "lucide-react"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"

interface TransactionsFilterProps {
  isOpen: boolean
  onFilterToggle: (value: boolean) => void
}

export const TransactionsFilter: FC<TransactionsFilterProps> = ({
  isOpen,
  onFilterToggle
}) => {
  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom)
  const [description, setDescription] = useState(filterProps.partialDescription)
  const debouncedDescription = useDebounce(description, 200)

  const { selectedGroup } = useActiveGroup()
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories({
      groupId: selectedGroup?.id?.toString()
    })

  useEffect(() => {
    setFilterProps({
      ...filterProps,
      partialDescription: debouncedDescription
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDescription])

  return (
    <>
      <div
        onClick={() => onFilterToggle(false)}
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-30 block cursor-pointer bg-fina-ink/60 transition-opacity xl:hidden xl:pointer-events-auto",
          {
            "opacity-100 pointer-events-auto": isOpen,
            "opacity-0 pointer-events-none": !isOpen
          }
        )}
      ></div>
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-screen w-[320px] cursor-auto overflow-hidden border-l-[3px] border-fina-ink bg-fina-canvas text-fina-ink shadow-[-8px_0_0_var(--fina-ink)] transition-all duration-300 xl:sticky xl:shadow-none",
          {
            "translate-x-0": isOpen,
            "translate-x-[calc(100%+8px)] xl:w-0 xl:border-l-0": !isOpen
          }
        )}
      >
        <div className="w-[320px]">
          <div className="flex h-20 items-center justify-between border-b-2 border-fina-ink bg-fina-lime px-5">
            <div>
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">
                Refine / 02
              </span>
              <h2 className="text-2xl font-black uppercase tracking-[-0.06em]">
                Filters
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close filters"
              onClick={() => onFilterToggle(false)}
              className="size-10 rounded-none border-2 border-fina-ink bg-fina-surface text-fina-ink shadow-fina-sm hover:bg-fina-ink hover:text-white"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex h-[calc(100vh-5rem)] flex-col overflow-y-auto p-5">
            <div className="flex-1">
              <div>
                <Label className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                  Search description
                </Label>
                <Input
                  type="text"
                  placeholder="Coffee, rent, flight..."
                  value={description}
                  onInput={(e) => {
                    setDescription((e.target as HTMLInputElement).value)
                  }}
                  className="mt-2 h-12 rounded-none border-2 border-fina-ink bg-fina-surface font-bold text-fina-ink shadow-fina-sm placeholder:font-mono placeholder:text-[11px] placeholder:uppercase placeholder:text-fina-ink/40 focus-visible:ring-fina-violet"
                />
              </div>
              <Separator className="my-6 h-0.5 bg-fina-ink" />
              <div>
                <Label className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                  Category
                </Label>

                {
                  <div className="mt-3 flex flex-col gap-2">
                    {isCategoriesLoading || categoriesData === undefined ? (
                      <div className="flex flex-col gap-3">
                        <Skeleton className="h-5 w-[200px]" />
                        <Skeleton className="h-5 w-[180px]" />
                        <Skeleton className="h-5 w-[230px]" />
                        <Skeleton className="h-5 w-[150px]" />
                        <Skeleton className="h-5 w-[170px]" />
                      </div>
                    ) : (
                      <>
                        {categoriesData?.map((category) => (
                          <div
                            className="flex items-center gap-3 border border-fina-ink bg-fina-surface px-3 py-2.5 hover:bg-fina-yellow"
                            key={category.id}
                          >
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={filterProps.categoriesId.includes(
                                category.id
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilterProps({
                                    ...filterProps,
                                    categoriesId: [
                                      ...filterProps.categoriesId,
                                      category.id
                                    ]
                                  })
                                } else {
                                  setFilterProps({
                                    ...filterProps,
                                    categoriesId:
                                      filterProps.categoriesId.filter(
                                        (id: string) => id !== category.id
                                      )
                                  })
                                }
                              }}
                              className="size-5 rounded-none border-2 border-fina-ink bg-fina-surface data-[state=checked]:bg-fina-violet data-[state=checked]:text-white"
                            />
                            <CategoryAppearance
                              icon={category.icon}
                              color={category.color}
                              className="size-7 border"
                            />
                            <div className="grid cursor-pointer gap-1.5 leading-none">
                              <label
                                htmlFor={`category-${category.id}`}
                                className="cursor-pointer text-sm font-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {category.name}
                              </label>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-3 border border-fina-ink bg-fina-surface px-3 py-2.5 hover:bg-fina-yellow">
                          <Checkbox
                            id="category-none"
                            checked={filterProps.categoriesId.includes("-1")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterProps({
                                  ...filterProps,
                                  categoriesId: [
                                    ...filterProps.categoriesId,
                                    "-1"
                                  ]
                                })
                              } else {
                                setFilterProps({
                                  ...filterProps,
                                  categoriesId: filterProps.categoriesId.filter(
                                    (id) => id !== "-1"
                                  )
                                })
                              }
                            }}
                            className="size-5 rounded-none border-2 border-fina-ink bg-fina-surface data-[state=checked]:bg-fina-violet data-[state=checked]:text-white"
                          />
                          <div className="grid cursor-pointer gap-1.5 leading-none">
                            <label
                              htmlFor={"category-none"}
                              className="cursor-pointer text-sm font-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              None
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                }
              </div>
            </div>

            <Button
              variant="fina-secondary"
              lift
              onClick={() => {
                setDescription("")
                setFilterProps({
                  ...filterProps,
                  partialDescription: "",
                  categoriesId: []
                })
              }}
              className="mt-6 h-11 w-full"
            >
              <RotateCcw className="size-4" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
