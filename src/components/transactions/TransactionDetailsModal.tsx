import { Transaction } from "@/data/transactions/Transaction";
import { dayjs } from "@/dayjs";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts";
import { useCategories } from "@/data/categories/useCategories";
import { BankAccount } from "@/data/bankAccounts/BankAccount";
import { Category } from "@/data/categories/Category";
import { Badge } from "@/components/ui/badge";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface TransactionDetailsModalProps {
  transaction: Transaction["Row"] | null;
  onNextTransaction: () => void;
  onPreviousTransaction: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalTransactions: number;
  currentTransactionIndex: number;
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
  onNextTransaction,
  onPreviousTransaction,
  totalTransactions,
  currentTransactionIndex,
}: TransactionDetailsModalProps) {
  const { selectedGroup } = useActiveGroup();
  const { data: bankAccountsData } = useBankAccounts({
    groupId: selectedGroup?.id?.toString(),
  });
  const { updateMutation } = useTransactionMutation();
  const { data: categoriesData } = useCategories({
    groupId: selectedGroup?.id?.toString(),
  });

  const [highlightNextButton, setHighlightNextButton] = useState(false);
  const [highlightPreviousButton, setHighlightPreviousButton] = useState(false);

  const highlightNextRef = useRef<NodeJS.Timeout | null>(null);
  const highlightPreviousRef = useRef<NodeJS.Timeout | null>(null);

  const hasNextTransaction = currentTransactionIndex < totalTransactions - 1;
  const hasPreviousTransaction = currentTransactionIndex > 0;

  const accountsMapById = React.useMemo(() => {
    if (!bankAccountsData) return {};
    return bankAccountsData.reduce(
      (
        acc: Record<number, BankAccount["Row"]>,
        current: BankAccount["Row"]
      ) => {
        acc[current.id] = current;
        return acc;
      },
      {}
    );
  }, [bankAccountsData]);

  const categoriesMapById = React.useMemo(() => {
    if (!categoriesData) return {};
    return categoriesData.reduce(
      (acc: Record<number, Category["Row"]>, current: Category["Row"]) => {
        acc[current.id] = current;
        return acc;
      },
      {}
    );
  }, [categoriesData]);

  const handleCategorySelect = useCallback(
    async (categoryId: number | null) => {
      if (!transaction) return;

      await updateMutation.mutateAsync({
        id: transaction?.id,
        transaction: { category_id: categoryId },
      });
    },
    [transaction, updateMutation]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!categoriesData || !transaction) return;

      // Number keys for categories (1-9)
      if (e.key >= "0" && e.key <= "9") {
        if (e.key === "0") {
          handleCategorySelect(null);
          return;
        }

        const index = parseInt(e.key) - 1;
        if (index < categoriesData.length) {
          const category = categoriesData[index];
          handleCategorySelect(category.id);
        }
      }

      // Space to skip
      if (e.key === " ") {
        handleCategorySelect(null);
        e.preventDefault();
      }

      // Arrow keys for navigation
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (!hasPreviousTransaction) return;

        if (highlightPreviousRef.current) {
          clearTimeout(highlightPreviousRef.current);
        }

        e.preventDefault();
        e.stopPropagation();
        onPreviousTransaction();
        setHighlightPreviousButton(true);
        highlightPreviousRef.current = setTimeout(() => {
          setHighlightPreviousButton(false);
        }, 300);
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (!hasNextTransaction) return;

        if (highlightNextRef.current) {
          clearTimeout(highlightNextRef.current);
        }

        e.preventDefault();
        e.stopPropagation();
        onNextTransaction();
        setHighlightNextButton(true);
        highlightNextRef.current = setTimeout(() => {
          setHighlightNextButton(false);
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    categoriesData,
    handleCategorySelect,
    hasNextTransaction,
    hasPreviousTransaction,
    onNextTransaction,
    onPreviousTransaction,
    transaction,
  ]);

  const accountData = transaction
    ? accountsMapById[transaction.bankaccount_id]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6 text-3xl">
            {transaction?.description}

            <div className="text-sm text-muted-foreground">
              {currentTransactionIndex + 1} / {totalTransactions}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed information about the transaction{" "}
            {transaction?.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Date
              </div>
              <div>
                {transaction?.date
                  ? dayjs(transaction?.date).format("dddd, DD/MM/YYYY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Due Date
              </div>
              <div>
                {transaction?.credit_due_date
                  ? dayjs(transaction?.credit_due_date).format(
                      "dddd, DD/MM/YYYY"
                    )
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Account
              </div>
              <div>
                {accountData?.name || "-"}
                {accountData?.type && (
                  <Badge variant="outline" className="ml-2">
                    {accountData?.type}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Value
              </div>
              <div
                className={`text-xl font-bold ${
                  transaction?.value && transaction?.value < 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {transaction?.value
                  ? `R$ ${(-transaction?.value).toFixed(2)}`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Installment
              </div>
              <div>
                {transaction?.installment_current &&
                transaction?.installment_total
                  ? `${transaction?.installment_current}/${transaction?.installment_total}`
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Category
              </div>
              <div>
                {transaction?.category_id &&
                categoriesMapById[transaction?.category_id] ? (
                  <Badge variant="secondary">
                    {categoriesMapById[transaction?.category_id]?.name}
                  </Badge>
                ) : (
                  <Badge variant="outline">-</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium text-muted-foreground mb-4">
              Categories
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categoriesData?.map((category, index) => (
                <Button
                  key={`${category.id}`}
                  onClick={() => handleCategorySelect(category.id)}
                  variant={
                    transaction?.category_id == category.id
                      ? "default"
                      : "outline"
                  }
                  className={
                    "flex items-center justify-start gap-2 px-2 transition-all"
                  }
                >
                  <Badge variant="secondary">{index + 1}</Badge>
                  <span className="text-xs">{category.name || "-"}</span>
                </Button>
              ))}

              <Button
                variant="outline"
                className={cn("flex items-center justify-start gap-2 px-2")}
                onClick={() => handleCategorySelect(null)}
              >
                <Badge variant="secondary">0</Badge>
                <span className="text-xs">None</span>
              </Button>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              className={cn("transition-all transition-duration-200", {
                "bg-accent": highlightPreviousButton,
              })}
              disabled={!hasPreviousTransaction}
              onClick={onPreviousTransaction}
            >
              <span>Previous</span>
              <div className="flex gap-1 text-xs">
                <Badge variant="secondary">
                  <ArrowUp className="w-3 h-3" />
                </Badge>
                <Badge variant="secondary">
                  <ArrowLeft className="w-3 h-3" />
                </Badge>
              </div>
            </Button>
            <Button
              variant="ghost"
              className={cn("transition-all transition-duration-200", {
                "bg-accent": highlightNextButton,
              })}
              disabled={!hasNextTransaction}
              onClick={onNextTransaction}
            >
              <span>Next</span>
              <div className="flex gap-1 text-xs">
                <Badge variant="secondary">
                  <ArrowDown className="w-3 h-3" />
                </Badge>
                <Badge variant="secondary">
                  <ArrowRight className="w-3 h-3" />
                </Badge>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
