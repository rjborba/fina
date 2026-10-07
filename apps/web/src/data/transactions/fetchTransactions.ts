import { transactionsControllerFindAll } from "@/api/generated"
import {
  QueryTransactionInputDto,
  QueryTransactionOutputDtoType
} from "@fina/types"
import dayjs from "dayjs"

export const fetchTransactions = async ({
  page,
  pageSize,
  groupId,
  startDate,
  endDate,
  categoryIdList,
  accountIdList,
  accountType,
  search,
  dateBasis
}: QueryTransactionInputDto): Promise<QueryTransactionOutputDtoType> => {
  const response = await transactionsControllerFindAll({
    groupId,
    page: page ? page - 1 : undefined,
    pageSize,
    startDate: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
    endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
    categoryIdList,
    accountIdList,
    accountType,
    search,
    dateBasis
  })
  return response as QueryTransactionOutputDtoType
}
