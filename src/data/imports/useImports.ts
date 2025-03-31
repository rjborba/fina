import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useImports = () => {
  return useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imports")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
