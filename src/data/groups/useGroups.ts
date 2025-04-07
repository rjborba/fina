import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const useGroups = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_group")
        .select(
          `
          group:group_id(*)
        `
        )
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      console.log(data);

      return data?.map((item) => item.group) || [];
    },
  });
};
