import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

type UseBankAccountsProps = {
  groupId?: string;
};

export const useBankAccounts = ({ groupId }: UseBankAccountsProps) => {
  return useQuery({
    enabled: groupId !== undefined,
    queryKey: ["bankaccounts", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bankaccounts")
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
