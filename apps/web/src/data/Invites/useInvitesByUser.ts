import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const useInvitesByUser = () => {
  const { user } = useAuth();

  console.log(user);

  return useQuery({
    queryKey: ["invites_by_user", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("invites")
        .select(
          `
          *
        `,
        )
        .eq("email", user.email!);

      if (error) {
        throw error;
      }

      return data;
    },
  });
};
