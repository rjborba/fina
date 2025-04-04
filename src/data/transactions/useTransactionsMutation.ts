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

    const { data, error } = await supabase
      .from("transactions")
      .update(transactionNormalized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Update the cache with the new data
    queryClient.setQueryData<Transaction["Row"][]>(
      ["transactions"],
      (oldData) => {
        if (!oldData) return oldData;

        return oldData.map((oldTransaction) => {
          if (oldTransaction.id === id) {
            return data;
          }
          return oldTransaction;
        });
      }
    );
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
