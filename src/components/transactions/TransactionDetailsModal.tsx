import { Transaction } from "@/data/transactions/Transaction";
import { dayjs } from "@/dayjs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TransactionDetailsModalProps {
  transaction: Transaction["Row"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Detailed information about the selected transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Date
              </div>
              <div>
                {transaction.date
                  ? dayjs(transaction.date).format("dddd, DD/MM/YYYY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Due Date
              </div>
              <div>
                {transaction.credit_due_date
                  ? dayjs(transaction.credit_due_date).format(
                      "dddd, DD/MM/YYYY"
                    )
                  : "-"}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-muted-foreground">
                Description
              </div>
              <div className="text-lg font-medium">
                {transaction.description || "-"}
                {transaction.installment_current &&
                  transaction.installment_total && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({transaction.installment_current}/
                      {transaction.installment_total})
                    </span>
                  )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Account
              </div>
              <div>
                {/* {accountsMapById[transaction.bankaccount_id]?.name || "-"} */}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Value
              </div>
              <div
                className={`text-xl font-bold ${
                  transaction.value && transaction.value < 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {transaction.value
                  ? `R$ ${(-transaction.value).toFixed(2)}`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Installment
              </div>
              <div>
                {transaction.installment_current &&
                transaction.installment_total
                  ? `${transaction.installment_current}/${transaction.installment_total}`
                  : "-"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium text-muted-foreground mb-4">
              Categories
            </div>
            {/* <div className="grid grid-cols-3 gap-2">
              {categoriesData?.map((category, index) => (
                <button
                  key={category.id}
                  className={`flex items-center gap-2 p-2 border rounded-lg hover:bg-accent ${
                    transaction.category_id === category.id
                      ? "bg-accent border-primary"
                      : ""
                  }`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <Badge variant="secondary">{index + 1}</Badge>
                  <span>{category.name || "-"}</span>
                </button>
              ))}
            </div> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
