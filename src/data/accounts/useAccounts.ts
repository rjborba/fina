import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useAccounts = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
