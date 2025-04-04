import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useTransactions = () => {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        // .or(
        //   `credit_due_date.gte.2024-01-01 00:00:00,credit_due_date.lte.2028-01-05 23:59:59` +
        //     `,date.gte.2024-01-01 00:00:00,date.lte.2028-01-30 23:59:59`
        // )
        .order("date", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
