import { FC, useState, Suspense, lazy } from "react";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useTransactions } from "@/data/transactions/useTransactions";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import { Separator } from "@/components/ui/separator";
import { TransactionsFilter } from "@/components/transactions/TransactionsFilter";
import { TransactionsHeader } from "@/components/transactions/TransactionsHeader";
import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom";
import { useAtom } from "jotai";
import { TransactionsTableProps } from "@/components/transactions/TransactionsTable";
import useLocalStorageState from "@/hooks/useLocalStorageState";

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
    groupdId: selectedGroup?.id?.toString() || "",
    startDate: filterProps.startDate,
    endDate: filterProps.endDate,
    search: filterProps.partialDescription || undefined,
    categoryIdList: filterProps.categoriesId,
  });

  const [isFilterOpen, setIsFilterOpen] = useLocalStorageState<boolean>(
    "transactionsFilterOpen",
    true
  );

  return (
    <div className="flex">
      <div className="flex flex-col flex-1">
        <TransactionsHeader
          isFilterOpen={isFilterOpen}
          onFilterToggle={setIsFilterOpen}
        />
        <Separator />
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              Loading transactions table...
            </div>
          }
        >
          <TransactionsTable
            data={transactionsData?.data}
            isLoading={isLoading}
            isError={isError}
            totalCount={transactionsData?.totalCount || 0}
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            onUpdateTransaction={async (id, transaction) => {
              updateTransaction.mutateAsync({ id, transaction });
            }}
            onDeleteTransaction={async (id) => {
              removeTransaction.mutateAsync(id);
            }}
          />
        </Suspense>
      </div>
      <TransactionsFilter
        isOpen={isFilterOpen}
        onFilterToggle={setIsFilterOpen}
      />
    </div>
  );
};
