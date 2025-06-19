import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Category } from "./Category";

export const useCategoriesMutation = () => {
  const queryClient = useQueryClient();

  const addCategory = async (category: Category["Insert"]) => {
    await supabase.from("categories").insert(category);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const removeCategory = async (id: number) => {
    await supabase.from("categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return { addCategory, removeCategory };
};
