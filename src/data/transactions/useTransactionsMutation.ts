import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Transaction } from "./Transaction";

export const useTransactionMutation = () => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (transactions: Transaction["Insert"][]) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transactions);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      transaction,
    }: {
      id: number;
      transaction: Transaction["Update"];
    }) => {
      const transactionNormalized = { ...transaction };
      delete transactionNormalized.id;

      const { data, error } = await supabase
        .from("transactions")
        .update(transactionNormalized)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ removed: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return {
    addMutation,
    updateMutation,
    removeMutation,
  };
};
