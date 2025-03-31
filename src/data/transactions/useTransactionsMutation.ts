import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Transaction } from "./Transaction";

export const useTransactionMutation = () => {
  const queryClient = useQueryClient();

  const addTransaction = async (transaction: Transaction["Insert"]) => {
    await supabase.from("transactions").insert(transaction);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const updateTransaction = async (
    id: number,
    transaction: Transaction["Update"]
  ) => {
    const transactionNormalized = { ...transaction };
    delete transactionNormalized.id;

    queryClient.setQueryData<Transaction["Row"][]>(
      ["transactions"],
      (oldData) => {
        if (!oldData) return oldData;

        const transactionIndex = oldData.findIndex(
          (oldTransaction) => oldTransaction.id === id
        );

        if (transactionIndex === -1) return oldData;

        return oldData.map((oldTransaction, index) => {
          if (index === transactionIndex) {
            return { ...oldTransaction, ...transactionNormalized };
          }
          return oldTransaction;
        });
      }
    );

    // Perform the actual update
    await supabase
      .from("transactions")
      .update(transactionNormalized)
      .eq("id", id);

    // Revalidate to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const addTransactions = async (transactions: Transaction["Insert"][]) => {
    const resp = await supabase.from("transactions").insert(transactions);
    console.log(resp);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const removeTransaction = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  return {
    addTransaction,
    addTransactions,
    removeTransaction,
    updateTransaction,
  };
};
