import { TransactionsFilter } from "@/components/transactions/TransactionsFilter";
import { TransactionsHeader } from "@/components/transactions/TransactionsHeader";
import { TransactionsTableProps } from "@/components/transactions/TransactionsTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom";
import { useTransactions } from "@/data/transactions/useTransactions";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import useLocalStorageState from "@/hooks/useLocalStorageState";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { PanelBottomClose, PanelBottomOpen } from "lucide-react";
import { FC, Fragment, Suspense, lazy, useState } from "react";

const TransactionsTable = lazy(() =>
  import("@/components/transactions/TransactionsTable").then((module) => ({
    default: module.default as FC<TransactionsTableProps>,
  }))
);

export const Transactions: FC = () => {
  const {
    updateMutation: updateTransaction,
    removeMutation: removeTransaction,
  } = useTransactionMutation();

  const { selectedGroup } = useActiveGroup();

  const [pagination] = useState({
    pageIndex: 0,
    pageSize: 4000,
  });

  const [filterProps] = useAtom(transactionFilterAtom);

  const {
    data: transactionsData,
    isLoading,
    isError,
  } = useTransactions({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    groupId: selectedGroup?.id?.toString() || "-1",
    startDate: filterProps.startDate,
    endDate: filterProps.endDate,
    search: filterProps.partialDescription || undefined,
    categoryIdList: filterProps.categoriesId,
  });

  const { data: categories } = useCategories({
    groupId: selectedGroup?.id?.toString() || "",
  });

  const [isFilterOpen, setIsFilterOpen] = useLocalStorageState<boolean>(
    "transactionsFilterOpen",
    true
  );

  const [isDrawerOpen, setIsDrawerOpen] = useLocalStorageState<boolean>(
    "transactionsDrawerOpen",
    false
  );

  const sum: Record<string, number> = {
    total: 0,
    income: 0,
    expense: 0,
  };

  const sumCategories: Record<string, number> = {};

  for (const transaction of transactionsData?.data || []) {
    if (!transaction.value) {
      continue;
    }
    sum.total += transaction.value;
    if (transaction.value > 0) {
      sum.income += transaction.value;
    } else {
      sum.expense += transaction.value;
    }

    if (transaction.category?.id) {
      if (sumCategories[transaction.category.id]) {
        sumCategories[transaction.category.id] += transaction.value;
      } else {
        sumCategories[transaction.category.id] = transaction.value;
      }
    }
  }

  // console.log(sum);
  // console.log(sumCategories);

  return (
    <div className="flex">
      <div className="flex flex-col flex-1">
        <TransactionsHeader
          isFilterOpen={isFilterOpen}
          onFilterToggle={setIsFilterOpen}
        />
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                Loading transactions table...
              </div>
            }
          >
            <TransactionsTable
              data={transactionsData?.data || []}
              isLoading={isLoading}
              isError={isError}
              totalCount={transactionsData?.totalCount || 0}
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              onUpdateTransaction={async (id, transaction) => {
                updateTransaction.mutateAsync({
                  id,
                  transaction: {
                    ...transaction,
                    categoryId: transaction.category?.id,
                    bankaccountId: transaction.bankaccount?.id,
                    groupId: transaction.group?.id,
                    importId: transaction.import?.id,
                  },
                });
              }}
              onDeleteTransaction={async (id) => {
                removeTransaction.mutateAsync(id);
              }}
            />
          </Suspense>
        </div>
        {/* Footer */}
        <div
          className={cn(
            "sticky bottom-0 bg-background border-t transition-all duration-300 h-[40px] py-1 px-4 overflow-hidden",
            {
              "h-[200px]": isDrawerOpen,
            }
          )}
        >
          <div className={cn("")}>
            <div className="flex items-center justify-between border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              >
                {!isDrawerOpen ? (
                  <PanelBottomOpen className="h-4 w-4" />
                ) : (
                  <PanelBottomClose className="h-4 w-4" />
                )}
              </Button>
              <div className="flex h-5 items-center space-x-4 text-xs">
                <p>
                  <span className="text-xs font-medium leading-none">
                    Total{" "}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    R${sum.total?.toFixed(2)}
                  </span>
                </p>
                <Separator orientation="vertical" />
                <p>
                  <span className="text-xs font-medium leading-none">
                    Incoming{" "}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    R${sum.income?.toFixed(2)}
                  </span>
                </p>
                <Separator orientation="vertical" />
                <p>
                  <span className="text-xs font-medium leading-none">
                    Expenses{" "}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    R${sum.expense?.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="flex h-5 items-center space-x-4 pt-4">
                {categories?.map((category) => {
                  return (
                    <Fragment key={category.id}>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {category.name}{" "}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R${" "}
                          {sumCategories[category.id]
                            ? sumCategories[category.id].toFixed(2)
                            : "0.00"}
                        </p>
                      </div>
                      <Separator orientation="vertical" className="h-full" />
                    </Fragment>
                  );
                })}
                {/* {Object.keys(sumCategories).map((categoryId) => {
                  return (
                    <Fragment key={categoryId}>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {categoryAsMap?.[categoryId] || ""}{" "}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R${sumCategories[categoryId]?.toFixed(2)}
                        </p>
                      </div>
                      <Separator orientation="vertical" />
                    </Fragment>
                  );
                })} */}
              </div>
            </div>
          </div>
        </div>
      </div>
      <TransactionsFilter
        isOpen={isFilterOpen}
        onFilterToggle={setIsFilterOpen}
      />
    </div>
  );
};
