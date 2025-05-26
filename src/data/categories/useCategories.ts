import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

type UseCategoriesProps = {
  groupId?: string;
};

export const useCategories = ({ groupId }: UseCategoriesProps) => {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["categories", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("group_id", groupId!)
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
