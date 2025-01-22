import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Transaction } from "./Transaction";

export const useTransactionMutation = () => {
  const queryClient = useQueryClient();

  const addTransaction = async (transaction: Transaction["Insert"]) => {
    await supabase.from("transactions").insert(transaction);
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
  };
};
