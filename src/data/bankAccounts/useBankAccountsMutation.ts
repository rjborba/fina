import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { BankAccount } from "./BankAccount";

export const useAccountsMutation = () => {
  const queryClient = useQueryClient();

  const addAccount = async (account: BankAccount["Insert"]) => {
    await supabase.from("bankaccounts").insert(account);
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  const removeAccount = async (id: number) => {
    await supabase.from("bankaccounts").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  return { addAccount, removeAccount };
};
