import { FC } from "react";
import { TableCell, TableRow } from "../../components/ui/table";
import dayjs from "dayjs";
import { BankAccount } from "../bankAccounts/BankAccount";
import { Transaction } from "./Transaction";
import { useTransactionMutation } from "./useTransactionsMutation";
import { EditableText } from "./EditableTextCell";
import { Button } from "../../components/ui/button";
import { EditableSelect } from "./EditableSelectCell";
import { Trash } from "lucide-react";
import { ConfirmationDialog } from "../../components/ui/confirmation-dialog";

interface TransactionRowProps {
  row: Transaction["Row"];
  rowIndex: number;
  accountsMapById: Record<string, BankAccount["Row"]>;
  categoriesData: { id: number; name: string | null }[];
}

export const TransactionRow: FC<TransactionRowProps> = ({
  row,
  accountsMapById,
  categoriesData,
}) => {
  const {
    updateMutation: updateTransaction,
    removeMutation: removeTransaction,
  } = useTransactionMutation();

  return (
    <TableRow>
      <TableCell className="w-[50px] text-muted-foreground text-xs">
        #{row.id}
      </TableCell>
      <TableCell className="w-[150px]">
        {row.bankaccount_id
          ? accountsMapById[row.bankaccount_id]?.name || "ERROR"
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
        <EditableSelect
          value={row.category_id}
          categories={categoriesData}
          transactionId={row.id}
          onChange={(value) => {
            return updateTransaction.mutateAsync({
              id: row.id,
              transaction: {
                category_id: value,
              },
            });
          }}
        />
      </TableCell>
      <TableCell className="w-[150px]">
        <EditableText
          value={row.observation || ""}
          onChange={(value) => {
            return updateTransaction.mutateAsync({
              id: row.id,
              transaction: {
                observation: value,
              },
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
          onConfirm={() => removeTransaction.mutateAsync(row.id)}
          confirmText="Delete"
        />
      </TableCell>
    </TableRow>
  );
};
