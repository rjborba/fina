import { FC, useMemo } from "react";
import { useTransactions } from "./data/transactions/useTransactions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";

import dayjs from "dayjs";
import { useAccounts } from "./data/accounts/useAccounts";
import { Account } from "./data/accounts/Account";
import { useCategories } from "./data/categories/useCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { useTransactionMutation } from "./data/transactions/useTransactionsMutation";
import { EditableText } from "./components/ui/editable-text";

const NONE_CATEGORY_ID = "none" as const;

const HEADERS = [
  "date",
  "credit_due_date",
  "description",
  "installment",
  "value",
  "category",
  "observation",
] as const;

export const Transactions: FC = () => {
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useTransactions();

  const { updateTransaction: updateTransaction } = useTransactionMutation();
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

  if (isLoadingTransactions || isLoadingAccounts || isLoadingCategories) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="p-4">
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
            {transactionsData?.map((row, rowIndex) => {
              return (
                <TableRow key={rowIndex}>
                  <TableCell className="w-[50px]">{rowIndex + 1}</TableCell>
                  <TableCell className="w-[150px]">
                    {row.account_id
                      ? accountsMapById[row.account_id]?.name || "ERROR"
                      : "NO ACCOUNT"}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    {dayjs(row.date).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    {row.credit_due_date
                      ? dayjs(row.credit_due_date).format("DD/MM/YYYY")
                      : ""}
                  </TableCell>
                  <TableCell className="w-[150px]">{row.description}</TableCell>
                  <TableCell className="w-[150px]">
                    {row.installment_current
                      ? `${row.installment_current}/${row.installment_total}`
                      : "Única"}
                  </TableCell>
                  <TableCell className="w-[150px]">{row.value}</TableCell>
                  <TableCell className="w-[150px]">
                    <Select
                      value={
                        row.category_id
                          ? String(row.category_id)
                          : NONE_CATEGORY_ID
                      }
                      onValueChange={(value) => {
                        updateTransaction(row.id, {
                          category_id:
                            value === NONE_CATEGORY_ID ? null : Number(value),
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesData?.map((category) => {
                          return (
                            <SelectItem
                              key={category.id}
                              value={String(category.id)}
                            >
                              {category.name}
                            </SelectItem>
                          );
                        })}
                        <SelectItem value={NONE_CATEGORY_ID}>-</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <EditableText
                      value={row.observation || ""}
                      onChange={(value) => {
                        updateTransaction(row.id, {
                          observation: value,
                        });
                      }}
                    />
                  </TableCell>
                  {/* <TableCell>{row.category_id}</TableCell> */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
