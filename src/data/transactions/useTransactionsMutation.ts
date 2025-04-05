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

    return supabase
      .from("transactions")
      .update(transactionNormalized)
      .eq("id", id)
      .select()
      .single();
  };

  const removeTransaction = async (id: number) => {
    return supabase
      .from("transactions")
      .update({ removed: true })
      .eq("id", id)
      .select()
      .single();
  };

  const addTransactions = async (transactions: Transaction["Insert"][]) => {
    const resp = await supabase.from("transactions").insert(transactions);
    console.log(resp);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  return {
    addTransaction,
    addTransactions,
    removeTransaction,
    updateTransaction,
  };
};
