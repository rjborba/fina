import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useImports = () => {
  return useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      return supabase.from("imports").select("*");
    },
  });
};
