import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useGroupById = (groupId: number) => {
  return useQuery({
    queryKey: ["group_by_id", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(
          `
          *
        `,
        )
        .eq("id", groupId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
