import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts";
import { BankAccount } from "@/data/bankAccounts/BankAccount";
import { useMemo, useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { fetchTransactions } from "@/data/transactions/fetchTransactions";
import { Transaction } from "@/data/transactions/Transaction";

export function TransactionsCategorization() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { selectedGroup } = useActiveGroup();
  const [transactionsData, setTransactionsData] = useState<
    Transaction["Row"][]
  >([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const { data: bankAccountsData, isLoading: isLoadingAccounts } =
    useBankAccounts({
      groupId: selectedGroup?.id?.toString(),
    });

  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories({
      groupId: selectedGroup?.id?.toString(),
    });

  const { updateMutation } = useTransactionMutation();

  useEffect(() => {
    const loadTransactions = async () => {
      if (!selectedGroup?.id) return;

      setIsLoadingTransactions(true);
      try {
        const result = await fetchTransactions({
          page: 1,
          pageSize: 1000, // Load a large number of transactions at once
          groupdId: selectedGroup.id.toString(),
          category_id: null,
        });
        setTransactionsData(result.data);
      } catch (error) {
        console.error("Error loading transactions:", error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [selectedGroup?.id]);

  const accountsMapById = useMemo(() => {
    if (!bankAccountsData) {
      return {};
    }

    return bankAccountsData.reduce((acc, current) => {
      acc[current.id] = current;
      return acc;
    }, {} as Record<string, BankAccount["Row"]>);
  }, [bankAccountsData]);

  const currentTransaction = transactionsData[currentIndex];
  const totalTransactions = transactionsData.length;

  const handleCategorySelect = useCallback(
    async (categoryId: number | null) => {
      if (!currentTransaction) return;

      await updateMutation.mutateAsync({
        id: currentTransaction.id,
        transaction: { category_id: categoryId },
      });

      // Update the local state to reflect the category change
      setTransactionsData((prev) => {
        const newData = [...prev];
        newData[currentIndex] = {
          ...newData[currentIndex],
          category_id: categoryId,
        };
        return newData;
      });

      // Move to next transaction
      setCurrentIndex((prev) => Math.min(totalTransactions - 1, prev + 1));
    },
    [currentIndex, currentTransaction, totalTransactions, updateMutation]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!categoriesData || !currentTransaction) return;

      // Number keys for categories (1-9)
      if (e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (index < categoriesData.length) {
          const category = categoriesData[index];
          handleCategorySelect(category.id);
        }
      }

      // Space to skip
      if (e.key === " ") {
        handleCategorySelect(null);
      }

      // Arrow keys for navigation
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => Math.min(totalTransactions - 1, prev + 1));
      }

      // Backspace to go back
      if (e.key === "Backspace") {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    categoriesData,
    currentTransaction,
    updateMutation,
    totalTransactions,
    handleCategorySelect,
  ]);

  if (isLoadingTransactions || isLoadingAccounts || isLoadingCategories) {
    return (
      <div className="p-4">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Transaction Categorization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentTransaction) {
    return (
      <div className="p-4">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Transaction Categorization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              No more transactions to categorize!
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Transaction Categorization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Transaction {currentIndex + 1} of {totalTransactions}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Space: Skip</Badge>
                <Badge variant="outline">←/→: Navigate</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Date
                </div>
                <div>
                  {currentTransaction.date
                    ? dayjs(currentTransaction.date).format("dddd, DD/MM/YYYY")
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Due Date
                </div>
                <div>
                  {currentTransaction.credit_due_date
                    ? dayjs(currentTransaction.credit_due_date).format(
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
                  {currentTransaction.description || "-"}
                  {currentTransaction.installment_current &&
                    currentTransaction.installment_total && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({currentTransaction.installment_current}/
                        {currentTransaction.installment_total})
                      </span>
                    )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Account
                </div>
                <div>
                  {accountsMapById[currentTransaction.bankaccount_id]?.name ||
                    "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Value
                </div>
                <div
                  className={`text-xl font-bold ${
                    currentTransaction.value && currentTransaction.value < 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {currentTransaction.value
                    ? `R$ ${(-currentTransaction.value).toFixed(2)}`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Installment
                </div>
                <div>
                  {currentTransaction.installment_current &&
                  currentTransaction.installment_total
                    ? `${currentTransaction.installment_current}/${currentTransaction.installment_total}`
                    : "-"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-4">
                Categories
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categoriesData?.map((category, index) => (
                  <button
                    key={category.id}
                    className={`flex items-center gap-2 p-2 border rounded-lg hover:bg-accent ${
                      currentTransaction.category_id === category.id
                        ? "bg-accent border-primary"
                        : ""
                    }`}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <Badge variant="secondary">{index + 1}</Badge>
                    <span>{category.name || "-"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
