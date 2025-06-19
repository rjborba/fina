import { useQuery } from "@tanstack/react-query";
import supabase from "@/supabaseClient";

export const useInvite = (inviteId: number) => {
    return useQuery({
        queryKey: ["invite", inviteId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("invites")
                .select("*")
                .eq("id", inviteId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        },
    });
};
