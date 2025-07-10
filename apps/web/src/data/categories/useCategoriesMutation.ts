import { useQueryClient } from "@tanstack/react-query";

import {
  CreateCategoryInputDtoType,
  CreateCategoryOutputDtoType,
  RemoveCategoryOutputDtoType,
} from "@fina/types";
import { FinaAPIFetcher } from "../FinaAPIFetcher";

export const useCategoriesMutation = () => {
  const queryClient = useQueryClient();

  const addCategory = async (category: CreateCategoryInputDtoType) => {
    await FinaAPIFetcher.post<CreateCategoryOutputDtoType>(
      "categories",
      category
    );
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const removeCategory = async (id: string) => {
    await FinaAPIFetcher.delete<RemoveCategoryOutputDtoType>(
      `categories/${id}`
    );
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return { addCategory, removeCategory };
};
