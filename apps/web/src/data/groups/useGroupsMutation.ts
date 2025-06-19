import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Group } from "./Groups";
import { useAuth } from "@/hooks/useAuth";

export const useGroupsMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addGroup = useMutation({
    mutationFn: async (group: Group["Insert"]) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data: userData } = await supabase.auth.getUser();

      // First create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({ ...group, creator_id: userData.user?.id })
        .select()
        .single();

      if (groupError) throw groupError;

      // Then add the user to the group. Should be a transaction.
      const { error: userGroupError } = await supabase
        .from("user_group")
        .insert({
          user_id: user.id,
          group_id: groupData.id,
        });

      if (userGroupError) throw userGroupError;

      return groupData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const removeGroup = useMutation({
    mutationFn: async (groupId: Group["Row"]["id"]) => {
      await supabase.from("groups").delete().eq("id", groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  return { addGroup, removeGroup };
};
