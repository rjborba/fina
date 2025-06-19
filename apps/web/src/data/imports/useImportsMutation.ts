import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { Import } from "./Import";

export const useImportsMutation = () => {
  const queryClient = useQueryClient();

  const addImport = async (_import: Import["Insert"]) => {
    const res = await supabase.from("imports").insert(_import).select();
    queryClient.invalidateQueries({ queryKey: ["imports"] });

    return res;
  };

  const removeImport = async (id: number) => {
    await supabase.from("imports").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
  };

  return { addImport, removeImport };
};
