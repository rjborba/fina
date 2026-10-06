import {
  creditCardBillsControllerFindAll,
  creditCardBillsControllerFindOne
} from "@/api/generated"
import type { CreditCardBillDetail, CreditCardBillListQuery } from "@fina/types"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"

export const creditCardBillKeys = {
  all: ["credit-card-bills"] as const,
  list: (query: CreditCardBillListQuery) =>
    [
      ...creditCardBillKeys.all,
      "list",
      query.groupId,
      query.startDate?.toISOString(),
      query.endDate?.toISOString()
    ] as const,
  detail: (groupId: string, accountId: string, billMonth: string) =>
    [
      ...creditCardBillKeys.all,
      "detail",
      groupId,
      accountId,
      billMonth
    ] as const
}

export function useCreditCardBills(
  query: CreditCardBillListQuery,
  enabled = true
) {
  return useQuery({
    enabled: enabled && !!query.groupId,
    queryKey: creditCardBillKeys.list(query),
    queryFn: () =>
      creditCardBillsControllerFindAll({
        groupId: query.groupId,
        startDate: query.startDate
          ? dayjs(query.startDate).format("YYYY-MM-DD")
          : undefined,
        endDate: query.endDate
          ? dayjs(query.endDate).format("YYYY-MM-DD")
          : undefined
      })
  })
}

export function useCreditCardBill(
  groupId: string | undefined,
  accountId: string | undefined,
  billMonth: string | undefined
) {
  return useQuery<CreditCardBillDetail>({
    enabled: !!groupId && !!accountId && !!billMonth,
    queryKey: creditCardBillKeys.detail(
      groupId || "",
      accountId || "",
      billMonth || ""
    ),
    queryFn: () =>
      creditCardBillsControllerFindOne({
        groupId: groupId!,
        accountId: accountId!,
        billMonth: billMonth!
      }) as Promise<CreditCardBillDetail>
  })
}
