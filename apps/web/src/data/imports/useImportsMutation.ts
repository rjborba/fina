import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabaseClient";
import { CreateImportInputDtoType, CreateImportOutputDto } from "@fina/types";
import { FinaAPIFetcher } from "../FinaAPIFetcher";

export const useImportsMutation = () => {
  const queryClient = useQueryClient();

  const addImport = async (_import: CreateImportInputDtoType) => {
    const response = await FinaAPIFetcher.post<CreateImportOutputDto>(
      `imports`,
      _import
    );

    queryClient.invalidateQueries({ queryKey: ["imports"] });

    return response.data;
  };

  const removeImport = async (id: number) => {
    await supabase.from("imports").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["imports"] });
  };

  return { addImport, removeImport };
};
