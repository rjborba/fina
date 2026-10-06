import dayjs from "dayjs"
import { atom } from "jotai"

const defaultTransactionFilter = {
  startDate: dayjs().startOf("month").toDate(),
  endDate: dayjs().endOf("month").toDate(),
  partialDescription: "",
  categoriesId: [] as string[]
}

export type TransactionFilterType = typeof defaultTransactionFilter

export const transactionFilterAtom = atom(defaultTransactionFilter)
