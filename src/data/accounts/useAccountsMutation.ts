import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Account } from "./Account";

export const useAccountsMutation = () => {
  const queryClient = useQueryClient();

  const addAccount = async (account: Account["Insert"]) => {
    await supabase.from("accounts").insert(account);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const removeAccount = async (id: number) => {
    await supabase.from("accounts").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  return { addAccount, removeAccount };
};
