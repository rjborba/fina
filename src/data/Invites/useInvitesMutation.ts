import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Invites } from "./Invites";

export const useInvitesMutation = () => {
  const queryClient = useQueryClient();

  const addInvite = useMutation({
    mutationFn: async (invite: Invites["Insert"]) => {
      const { data: inviteData, error: insertInviteError } = await supabase
        .from("invites")
        .insert(invite)
        .select()
        .single();

      if (insertInviteError) throw insertInviteError;

      queryClient.invalidateQueries({ queryKey: ["invites"] });

      return inviteData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const removeInvite = useMutation({
    mutationFn: async (inviteId: number) => {
      const { error: deleteInviteError } = await supabase
        .from("invites")
        .delete()
        .eq("id", inviteId);

      if (deleteInviteError) throw deleteInviteError;

      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
  return { addInvite, removeInvite };
};
