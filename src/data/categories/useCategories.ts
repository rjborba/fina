import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      return supabase.from("categories").select("*");
    },
  });
};
