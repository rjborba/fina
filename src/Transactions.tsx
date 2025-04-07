import { FC, useMemo, useState } from "react";
import { useTransactions } from "./data/transactions/useTransactions";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { useBankAccounts } from "./data/bankAccounts/useBankAccounts";
import { BankAccount } from "./data/bankAccounts/BankAccount";
import { useCategories } from "./data/categories/useCategories";
import { TransactionRow } from "./data/transactions/TransactionRow";
import { Pagination } from "./components/ui/pagination";
import { useActiveGroup } from "./contexts/ActiveGroupContext";

const HEADERS = [
  "date",
  "credit_due_date",
  "description",
  "installment",
  "value",
  "category",
  "observation",
  "actions",
] as const;

const DEFAULT_PAGE_SIZE = 100;

export const Transactions: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { selectedGroup } = useActiveGroup();

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useTransactions({
      page: currentPage,
      pageSize,
      groupdId: selectedGroup?.id?.toString(),
    });

  const { data: bankAccountsData, isLoading: isLoadingAccounts } =
    useBankAccounts({ groupId: selectedGroup?.id?.toString() });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories({ groupId: selectedGroup?.id?.toString() });

  const accountsMapById = useMemo(() => {
    if (!bankAccountsData) {
      return {};
    }

    return bankAccountsData.reduce((acc, current) => {
      acc[current.id] = current;
      return acc;
    }, {} as Record<string, BankAccount["Row"]>);
  }, [bankAccountsData]);

  const totalPages = Math.ceil((transactionsData?.totalCount || 0) / pageSize);

  if (isLoadingTransactions || isLoadingAccounts || isLoadingCategories) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="p-4">
        <div className="mb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[150px]">Account</TableHead>
              {HEADERS.map((column) => (
                <TableHead key={column} className="w-[150px]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsData?.data?.map((transaction, rowIndex) => (
              <TransactionRow
                key={transaction.id}
                row={transaction}
                rowIndex={rowIndex}
                accountsMapById={accountsMapById}
                categoriesData={categoriesData || []}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
