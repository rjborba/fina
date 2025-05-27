import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

type UseImportsProps = {
  groupId?: string;
};

export const useImports = ({ groupId }: UseImportsProps) => {
  return useQuery({
    enabled: groupId !== undefined,
    queryKey: ["imports", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imports")
        .select("*")
        .order("id", { ascending: true })
        .eq("group_id", Number(groupId));

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
