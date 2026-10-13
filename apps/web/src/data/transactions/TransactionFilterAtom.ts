import dayjs from "dayjs"
import { atom } from "jotai"

export type TransactionFilterType = {
  startDate: Date
  endDate: Date
  partialDescription: string
  categoriesId: string[]
  accountsId?: string[]
  creditCardsId?: string[]
  importSource?: "imported" | "manual"
  importsId?: string[]
  minValue?: number
  maxValue?: number
  reviewMonths?: string[]
}

export function createDefaultTransactionFilter(): TransactionFilterType {
  return {
    startDate: dayjs().startOf("month").toDate(),
    endDate: dayjs().endOf("month").toDate(),
    partialDescription: "",
    categoriesId: [] as string[]
  }
}

export const transactionFilterAtom = atom(createDefaultTransactionFilter())
