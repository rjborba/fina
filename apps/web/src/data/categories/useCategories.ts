import { useQuery } from "@tanstack/react-query";

import { QueryCategoryOutputDtoType } from "@fina/types";
import { FinaAPIFetcher } from "../FinaAPIFetcher";

type UseCategoriesProps = {
  groupId?: string;
};

export const useCategories = ({ groupId }: UseCategoriesProps) => {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["categories", groupId],
    queryFn: async () => {
      const response = await FinaAPIFetcher.get<QueryCategoryOutputDtoType>(
        `categories`,
        {
          groupId,
        }
      );

      return response.data;
    },
  });
};
