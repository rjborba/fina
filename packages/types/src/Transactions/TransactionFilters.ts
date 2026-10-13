import { z } from "zod";

const queryList = <Item extends z.ZodTypeAny>(item: Item) =>
  z
    .any()
    .transform((value: unknown) =>
      value === undefined || value === null
        ? undefined
        : Array.isArray(value)
          ? value
          : [value]
    )
    .pipe(z.array(item).optional());

const valueBound = z
  .union([z.number(), z.string().trim().min(1)])
  .pipe(z.coerce.number().finite())
  .optional();

export const TransactionFilterQueryShape = {
  categoryIdList: queryList(
    z.union([z.string().regex(/^\d+$/), z.literal("-1")])
  ).describe("Category IDs, including -1 for uncategorized transactions"),
  accountIdList: queryList(z.string().regex(/^\d+$/)).describe(
    "Account IDs to filter by"
  ),
  creditCardIdList: queryList(
    z.union([z.string().regex(/^\d+$/), z.literal("-1")])
  ).describe(
    "Individual card IDs; -1 matches unassigned credit purchases only"
  ),
  search: z.string().optional().describe("Search transaction descriptions"),
  importSource: z
    .enum(["imported", "manual"])
    .optional()
    .describe("Imported transactions or transactions entered manually"),
  importIdList: queryList(z.string().regex(/^\d+$/)).describe(
    "Import IDs to filter by"
  ),
  minValue: valueBound.describe("Inclusive minimum signed transaction value"),
  maxValue: valueBound.describe("Inclusive maximum signed transaction value")
};

export const hasValidTransactionValueRange = (query: {
  minValue?: number;
  maxValue?: number;
}) =>
  query.minValue === undefined ||
  query.maxValue === undefined ||
  query.minValue <= query.maxValue;
