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
    onMutate: async ({ id, transaction: updatedTransactionFields }) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions"],
        exact: false,
      });

      const previous = queryClient.getQueriesData<{
        data: Transaction["Row"][];
      }>({
        queryKey: ["transactions"],
        exact: false,
      });

      queryClient.setQueriesData<{
        data: Transaction["Row"][];
        totalCount: number;
      }>({ queryKey: ["transactions"], exact: false }, (old) => {
        if (!old) {
          return { data: [], totalCount: 0 };
        }

        const oldTransactions = old.data;

        return {
          data: oldTransactions.map((item) =>
            item.id === id ? { ...item, ...updatedTransactionFields } : item
          ),
          totalCount: old.totalCount,
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      // Do I really need to invalidate the query if we've got a success mutation?
      // queryClient.invalidateQueries({
      //   queryKey: ["transactions"],
      //   exact: false,
      // });
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
