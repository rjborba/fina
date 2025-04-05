import { FC } from "react";
import { TableCell, TableRow } from "../../components/ui/table";
import dayjs from "dayjs";
import { Account } from "../accounts/Account";
import { Transaction } from "./Transaction";
import { useTransactionMutation } from "./useTransactionsMutation";
import { EditableText } from "../../components/ui/editable-text";
import { Button } from "../../components/ui/button";
import { CategorySelect } from "./CategorySelect";
import { Trash } from "lucide-react";
import { ConfirmationDialog } from "../../components/ui/confirmation-dialog";

interface TransactionRowProps {
  row: Transaction["Row"];
  rowIndex: number;
  accountsMapById: Record<string, Account["Row"]>;
  categoriesData: { id: number; name: string | null }[];
}

export const TransactionRow: FC<TransactionRowProps> = ({
  row,
  rowIndex,
  accountsMapById,
  categoriesData,
}) => {
  const { updateTransaction, removeTransaction } = useTransactionMutation();

  return (
    <TableRow>
      <TableCell className="w-[50px]">{rowIndex + 1}</TableCell>
      <TableCell className="w-[150px]">
        {row.account_id
          ? accountsMapById[row.account_id]?.name || "ERROR"
          : "NO ACCOUNT"}
      </TableCell>
      <TableCell className="w-[150px]">
        {row.date ? dayjs(row.date).format("DD/MM/YYYY") : ""}
      </TableCell>
      <TableCell className="w-[150px]">
        {row.credit_due_date
          ? dayjs(row.credit_due_date).format("DD/MM/YYYY")
          : ""}
      </TableCell>
      <TableCell className="w-[150px]">{row.description || ""}</TableCell>
      <TableCell className="w-[150px]">
        {row.installment_current
          ? `${row.installment_current}/${row.installment_total}`
          : "Única"}
      </TableCell>
      <TableCell className="w-[150px]">{row.value || ""}</TableCell>
      <TableCell className="w-[150px]">
        <CategorySelect
          value={row.category_id}
          categories={categoriesData}
          transactionId={row.id}
        />
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
      <TableCell className="w-[150px]">
        <ConfirmationDialog
          trigger={
            <Button variant="ghost">
              <Trash className="h-4 w-4" />
            </Button>
          }
          title="Delete Transaction"
          description="Are you sure you want to delete this transaction? This action cannot be undone."
          onConfirm={() => removeTransaction(row.id)}
          confirmText="Delete"
        />
      </TableCell>
    </TableRow>
  );
};
