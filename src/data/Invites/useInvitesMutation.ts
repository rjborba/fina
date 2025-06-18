import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Invites } from "./Invites";

export const useInvitesMutation = () => {
  const queryClient = useQueryClient();

  const addInvite = useMutation({
    mutationFn: async (
      invite: Pick<Invites["Insert"], "email" | "group_id">,
    ) => {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: invite.email,
          group_id: invite.group_id,
        },
      });

      if (error) {
        throw error;
      }
      if (!data?.inviteInserted) {
        throw new Error(data?.message || "Failed to create invite");
      }

      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      return data;
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
