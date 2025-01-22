import { FC } from "react";
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
// import { Select } from "@radix-ui/react-select";

const HEADERS = [
  "date",
  "description",
  "installment",
  "value",
  "category",
] as const;

export const Transactions: FC = () => {
  const { data: transactionsData } = useTransactions();
  console.log(transactionsData?.data);
  return (
    <div>
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Account</TableHead>
              {HEADERS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsData?.data?.map((row, rowIndex) => {
              return (
                <TableRow key={rowIndex}>
                  <TableCell>{rowIndex + 1}</TableCell>
                  <TableCell>{row.account_id}</TableCell>
                  <TableCell>{dayjs(row.date).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>
                    {row.installment_current
                      ? `${row.installment_current}/${row.installment_total}`
                      : "Única"}
                  </TableCell>
                  <TableCell>{row.value}</TableCell>
                  <TableCell>{row.category_id}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
