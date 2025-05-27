import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

type UseUsersPerGroupProps = {
  groupId?: string;
};

export const useUsersPerGroup = ({ groupId }: UseUsersPerGroupProps) => {
  const { user } = useAuth();

  return useQuery({
    enabled: groupId !== undefined,
    queryKey: ["usersPerGroup", groupId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("users_per_group")
        .select("*")
        .eq("group_id", Number(groupId));

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
