import { z } from "zod"
import {
  createDefaultTransactionFilter,
  type TransactionFilterType
} from "./TransactionFilterAtom"

const MAX_STORED_FILTER_LENGTH = 16_384

function parseCalendarDay(value: string, endOfDay = false): Date {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

const calendarDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number)
    const date = parseCalendarDay(value)
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    )
  })

const resourceIdsSchema = z
  .array(z.string().max(20).regex(/^\d+$/))
  .max(200)
  .transform((ids) => [...new Set(ids)])

const storedTransactionFilterSchema = z
  .object({
    startDate: calendarDaySchema,
    endDate: calendarDaySchema,
    partialDescription: z.string().max(1000),
    categoriesId: z
      .array(
        z
          .string()
          .max(20)
          .regex(/^(?:\d+|-1)$/)
      )
      .max(200)
      .transform((ids) => [...new Set(ids)]),
    accountsId: resourceIdsSchema.optional(),
    creditCardsId: z
      .array(
        z
          .string()
          .max(20)
          .regex(/^(?:\d+|-1)$/)
      )
      .max(200)
      .transform((ids) => [...new Set(ids)])
      .optional(),
    importSource: z.enum(["imported", "manual"]).optional(),
    importsId: resourceIdsSchema.optional(),
    minValue: z.number().finite().optional(),
    maxValue: z.number().finite().optional(),
    reviewMonths: z
      .array(z.string().regex(/^(?!0000)\d{4}-(?:0[1-9]|1[0-2])$/))
      .min(1)
      .max(120)
      .transform((months) => [...new Set(months)].sort())
      .optional()
  })
  .refine((filter) => filter.startDate <= filter.endDate)
  .refine(
    (filter) =>
      filter.minValue === undefined ||
      filter.maxValue === undefined ||
      filter.minValue <= filter.maxValue
  )

function formatCalendarDay(date: Date): string | null {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-")
}

export function transactionFiltersStorageKey(
  userId: string,
  groupId: string
): string {
  return `transactionFilters:v1:${encodeURIComponent(userId)}:${encodeURIComponent(groupId)}`
}

export function readTransactionFilters(key: string): TransactionFilterType {
  try {
    const raw = globalThis.localStorage.getItem(key)
    if (raw && raw.length <= MAX_STORED_FILTER_LENGTH) {
      const parsed = storedTransactionFilterSchema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        return {
          startDate: parseCalendarDay(parsed.data.startDate),
          endDate: parseCalendarDay(parsed.data.endDate, true),
          partialDescription: parsed.data.partialDescription,
          categoriesId: parsed.data.categoriesId,
          ...(parsed.data.accountsId !== undefined
            ? { accountsId: parsed.data.accountsId }
            : {}),
          ...(parsed.data.creditCardsId !== undefined
            ? { creditCardsId: parsed.data.creditCardsId }
            : {}),
          ...(parsed.data.importSource !== undefined
            ? { importSource: parsed.data.importSource }
            : {}),
          ...(parsed.data.importsId !== undefined
            ? { importsId: parsed.data.importsId }
            : {}),
          ...(parsed.data.minValue !== undefined
            ? { minValue: parsed.data.minValue }
            : {}),
          ...(parsed.data.maxValue !== undefined
            ? { maxValue: parsed.data.maxValue }
            : {}),
          ...(parsed.data.reviewMonths
            ? { reviewMonths: parsed.data.reviewMonths }
            : {})
        }
      }
    }
  } catch {
    // Filtering remains usable when browser storage is unavailable.
  }
  return createDefaultTransactionFilter()
}

export function writeTransactionFilters(
  key: string,
  filter: TransactionFilterType
): void {
  try {
    const parsed = storedTransactionFilterSchema.safeParse({
      startDate: formatCalendarDay(filter.startDate),
      endDate: formatCalendarDay(filter.endDate),
      partialDescription: filter.partialDescription,
      categoriesId: filter.categoriesId,
      accountsId: filter.accountsId,
      creditCardsId: filter.creditCardsId,
      importSource: filter.importSource,
      importsId: filter.importsId,
      minValue: filter.minValue,
      maxValue: filter.maxValue,
      reviewMonths: filter.reviewMonths
    })
    if (parsed.success) {
      globalThis.localStorage.setItem(key, JSON.stringify(parsed.data))
    }
  } catch {
    // Storage failures must not prevent in-memory filter updates.
  }
}
