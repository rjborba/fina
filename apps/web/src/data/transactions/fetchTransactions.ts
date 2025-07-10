import dayjs from "dayjs";
import { FinaAPIFetcher } from "../FinaAPIFetcher";
import {
  QueryTransactionInputDto,
  QueryTransactionOutputDtoType,
} from "@fina/types";

export const fetchTransactions = async ({
  page,
  pageSize,
  groupId,
  startDate,
  endDate,
  categoryIdList,
  accountIdList,
  search,
}: QueryTransactionInputDto): Promise<QueryTransactionOutputDtoType> => {
  const getFormattedDate = (date?: Date) => {
    if (!date) return undefined;

    return dayjs(date).format("YYYY-MM-DD");
  };

  const formattedStartDate = getFormattedDate(startDate);
  const formattedEndDate = getFormattedDate(endDate);

  const response = await FinaAPIFetcher.get<QueryTransactionOutputDtoType>(
    "transactions",
    {
      groupId: groupId,
      page: page ? page - 1 : undefined,
      pageSize,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      categoryIdList,
      accountIdList,
      search,
    }
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch transactions");
  }

  return response.data;
};
