import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
