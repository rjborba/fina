import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useAccounts = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      return supabase.from("accounts").select("*");
    },
  });
};
