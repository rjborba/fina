import { FC, useMemo, useState } from "react";
import { useTransactions } from "./data/transactions/useTransactions";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { useAccounts } from "./data/accounts/useAccounts";
import { Account } from "./data/accounts/Account";
import { useCategories } from "./data/categories/useCategories";
import { TransactionRow } from "./data/transactions/TransactionRow";
import { Pagination } from "./components/ui/pagination";

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

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useTransactions({ page: currentPage, pageSize });

  const { data: accountsData, isLoading: isLoadingAccounts } = useAccounts();
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories();

  const accountsMapById = useMemo(() => {
    if (!accountsData) {
      return {};
    }

    return accountsData.reduce((acc, current) => {
      acc[current.id] = current;
      return acc;
    }, {} as Record<string, Account["Row"]>);
  }, [accountsData]);

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
            {transactionsData?.data?.map((row, rowIndex) => (
              <TransactionRow
                key={rowIndex}
                row={row}
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
