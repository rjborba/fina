import { z } from "zod";
import { BillMonthSchema } from "../BillMonth";

export const IMPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 5000,
  maxRequestBytes: 8 * 1024 * 1024,
  maxFileNameLength: 255,
  maxDescriptionLength: 500
} as const;

export const ImportEncodingSchema = z.enum(["utf-8", "windows-1252"]);
export const ImportDelimiterSchema = z.enum([",", ";", "\t", "|"]);
export const ImportDateFormatSchema = z.enum([
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "YYYY-MM-DDTHH:mm:ss"
]);
export const ImportNumberFormatSchema = z.enum([
  "decimal-comma",
  "decimal-point"
]);

const ColumnIndexSchema = z.number().int().min(0).max(500);
const NullableColumnIndexSchema = ColumnIndexSchema.nullable();

export const ImportMappingConfigSchema = z
  .object({
    version: z.literal(1),
    delimiter: ImportDelimiterSchema,
    encoding: ImportEncodingSchema,
    hasHeader: z.boolean(),
    dateFormat: ImportDateFormatSchema,
    numberFormat: ImportNumberFormatSchema,
    dateColumn: ColumnIndexSchema,
    descriptionColumns: z.array(ColumnIndexSchema).max(10),
    installmentColumn: NullableColumnIndexSchema,
    amountMode: z.enum(["signed", "debit-credit"]),
    amountColumn: NullableColumnIndexSchema,
    debitColumn: NullableColumnIndexSchema,
    creditColumn: NullableColumnIndexSchema,
    chargesPositive: z.boolean()
  })
  .strict()
  .superRefine((config, context) => {
    if (config.amountMode === "signed" && config.amountColumn === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountColumn"],
        message: "An amount column is required for signed amount mode"
      });
    }
    if (
      config.amountMode === "debit-credit" &&
      (config.debitColumn === null || config.creditColumn === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["debitColumn"],
        message: "Debit and credit columns are required"
      });
    }
  });

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Date must be a real calendar date");

export const NormalizedImportRowSchema = z
  .object({
    sourceRow: z.number().int().min(1).max(1_000_000),
    date: IsoDateSchema,
    amount: z
      .number()
      .finite()
      .safe()
      .min(-1_000_000_000_000)
      .max(1_000_000_000_000),
    description: z
      .string()
      .trim()
      .max(IMPORT_LIMITS.maxDescriptionLength)
      .nullable(),
    installmentCurrent: z.number().int().min(1).max(10_000).nullable(),
    installmentTotal: z.number().int().min(1).max(10_000).nullable()
  })
  .strict()
  .superRefine((row, context) => {
    if (
      (row.installmentCurrent === null) !== (row.installmentTotal === null) ||
      (row.installmentCurrent !== null &&
        row.installmentTotal !== null &&
        row.installmentCurrent > row.installmentTotal)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentCurrent"],
        message: "Installment values must form a valid current/total pair"
      });
    }
  });

export const ImportPayloadSchema = z
  .object({
    groupId: z.string().regex(/^\d+$/),
    accountId: z.string().regex(/^\d+$/),
    billMonth: BillMonthSchema.nullable(),
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(IMPORT_LIMITS.maxFileNameLength)
      .refine((value) => value.toLocaleLowerCase().endsWith(".csv"), {
        message: "Filename must use the .csv extension"
      })
      .refine(
        (value) =>
          ![...value].some((character) => {
            const code = character.charCodeAt(0);
            return code < 32 || code === 127;
          }),
        {
          message: "Filename contains control characters"
        }
      ),
    fileSize: z.number().int().min(1).max(IMPORT_LIMITS.maxFileBytes),
    fileHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    excludedRowCount: z.number().int().min(0).max(1_000_000),
    config: ImportMappingConfigSchema,
    rows: z.array(NormalizedImportRowSchema).min(1).max(IMPORT_LIMITS.maxRows)
  })
  .strict()
  .superRefine((payload, context) => {
    const seenRows = new Set<number>();
    payload.rows.forEach((row, index) => {
      if (seenRows.has(row.sourceRow)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", index, "sourceRow"],
          message: "Source row numbers must be unique"
        });
      }
      seenRows.add(row.sourceRow);
    });
  });

export const PreviewImportInputDtoSchema = ImportPayloadSchema;
export const CreateImportInputDtoSchema = ImportPayloadSchema;

export type ImportMappingConfig = z.infer<typeof ImportMappingConfigSchema>;
export type NormalizedImportRow = z.infer<typeof NormalizedImportRowSchema>;
export type PreviewImportInputDto = z.infer<typeof PreviewImportInputDtoSchema>;
export type CreateImportInputDtoType = z.infer<
  typeof CreateImportInputDtoSchema
>;
export type CreateImportInputDto = CreateImportInputDtoType;
