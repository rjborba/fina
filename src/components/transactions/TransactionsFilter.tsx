import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { FC, useEffect, useState } from "react";

import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/components/ui/multipleselector";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";

interface TransactionsFilterProps {
  isOpen: boolean;
}

export const TransactionsFilter: FC<TransactionsFilterProps> = ({ isOpen }) => {
  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom);
  const [description, setDescription] = useState(
    filterProps.partialDescription
  );
  const debouncedDescription = useDebounce(description, 200);

  const { selectedGroup } = useActiveGroup();
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories({
      groupId: selectedGroup?.id?.toString(),
    });

  useEffect(() => {
    setFilterProps({
      ...filterProps,
      partialDescription: debouncedDescription,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDescription]);

  return (
    <div
      className={cn(
        "bg-background border-l sticky right-0 top-0 h-screen transition-all duration-300 overflow-hidden w-[400px] z-20",
        {
          "w-0": !isOpen,
        }
      )}
    >
      <div
        className={cn("p-4 transition-all duration-300", {
          "opacity-0": !isOpen,
        })}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">Filter</span>
        </div>
        <div className="flex flex-col gap-2 pt-4">
          <div>
            <Label>Description</Label>
            <Input
              type="text"
              value={description}
              onInput={(e) => {
                setDescription((e.target as HTMLInputElement).value);
              }}
            />
          </div>
          <Separator className="my-4" />
          <div>
            {/* Extract to another component */}
            <Label>Category</Label>

            {
              <div className="flex flex-col gap-2 mt-2">
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
                        className="items-top flex space-x-2"
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
                                  category.id,
                                ],
                              });
                            } else {
                              setFilterProps({
                                ...filterProps,
                                categoriesId: filterProps.categoriesId.filter(
                                  (id: number) => id !== category.id
                                ),
                              });
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none cursor-pointer">
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category.name}
                          </label>
                        </div>
                      </div>
                    ))}
                    <div className="items-top flex space-x-2">
                      <Checkbox
                        id="category-none"
                        checked={filterProps.categoriesId.includes(-1)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterProps({
                              ...filterProps,
                              categoriesId: [...filterProps.categoriesId, -1],
                            });
                          } else {
                            setFilterProps({
                              ...filterProps,
                              categoriesId: filterProps.categoriesId.filter(
                                (id: number) => id !== -1
                              ),
                            });
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none cursor-pointer">
                        <label
                          htmlFor={"category-none"}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
      </div>
    </div>
  );
};
