import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const useInvites = (groupId: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("invites")
        .select(
          `
          *
        `,
        )
        .eq("group_id", groupId);

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
