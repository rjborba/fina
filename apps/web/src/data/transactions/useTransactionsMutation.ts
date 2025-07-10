import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import {
  CreateTransactionInputDtoType,
  CreateTransactionOutputDto,
  Transaction,
  UpdateTransactionInputDtoSchema,
  UpdateTransactionInputDtoType,
} from "@fina/types";
import { FinaAPIFetcher } from "../FinaAPIFetcher";

export const useTransactionMutation = () => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    retry: 0,
    mutationFn: async (
      transactionOrTransactions:
        | CreateTransactionInputDtoType
        | CreateTransactionInputDtoType[]
    ) => {
      const response = await FinaAPIFetcher.post<
        CreateTransactionOutputDto | CreateTransactionOutputDto[]
      >(`transactions`, transactionOrTransactions);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updateMutation = useMutation({
    retry: 0,
    mutationFn: async ({
      id,
      transaction,
    }: {
      id: string;
      transaction: UpdateTransactionInputDtoType;
    }) => {
      const validated = UpdateTransactionInputDtoSchema.safeParse(transaction);

      if (!validated.success) {
        throw new Error("Invalid transaction update");
      }

      const response = await FinaAPIFetcher.patch<Transaction>(
        `transactions/${id}`,
        transaction
      );

      return response.data;
    },
    onMutate: async ({ id, transaction: updatedTransactionFields }) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions"],
        exact: false,
      });

      const previous = queryClient.getQueriesData<{
        data: Transaction[];
      }>({
        queryKey: ["transactions"],
        exact: false,
      });

      queryClient.setQueriesData<{
        data: Transaction[];
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
    retry: 0,
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ removed: true })
        .eq("id", Number(id))
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
