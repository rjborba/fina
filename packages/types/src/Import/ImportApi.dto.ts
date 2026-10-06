import { z } from "zod";
import { ImportMappingConfigSchema } from "./CreateImport.input.dto";

export const ImportIssueSchema = z
  .object({
    sourceRow: z.number().int().min(1),
    field: z.enum(["date", "description", "amount", "installment"]).optional(),
    code: z.string(),
    message: z.string(),
    severity: z.enum(["error", "warning"])
  })
  .strict();

export const ImportPreviewSummarySchema = z.object({
  includedRowCount: z.number().int().min(0),
  excludedRowCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  dateStart: z.string().date().nullable(),
  dateEnd: z.string().date().nullable(),
  inflowCount: z.number().int().min(0),
  inflowTotal: z.number().finite(),
  outflowCount: z.number().int().min(0),
  outflowTotal: z.number().finite()
});

export const DuplicateImportSchema = z.object({
  importId: z.string(),
  fileName: z.string(),
  createdAt: z.string().datetime()
});

export const PreviewImportOutputSchema = z.object({
  valid: z.boolean(),
  summary: ImportPreviewSummarySchema,
  issues: z.array(ImportIssueSchema),
  duplicate: DuplicateImportSchema.nullable()
});

export const ImportSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  fileName: z.string(),
  groupId: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  billDueDate: z.string().date().nullable(),
  transactionCount: z.number().int().min(0),
  excludedRowCount: z.number().int().min(0),
  dateStart: z.string().date().nullable(),
  dateEnd: z.string().date().nullable()
});

export const ImportProfileSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  sourceFingerprint: z.string(),
  config: ImportMappingConfigSchema,
  updatedAt: z.string().datetime()
});

export const ImportProfileListOutputSchema = z.array(ImportProfileSchema);
export const ImportProfileQuerySchema = z.object({
  groupId: z.string().regex(/^\d+$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/)
});

export const ImportListOutputSchema = z.array(ImportSummarySchema);
export const DeleteImportOutputSchema = z.object({ id: z.string() });

export type ImportIssue = z.infer<typeof ImportIssueSchema>;
export type ImportPreviewSummary = z.infer<typeof ImportPreviewSummarySchema>;
export type PreviewImportOutput = z.infer<typeof PreviewImportOutputSchema>;
export type ImportSummary = z.infer<typeof ImportSummarySchema>;
export type ImportProfile = z.infer<typeof ImportProfileSchema>;
export type ImportProfileQuery = z.infer<typeof ImportProfileQuerySchema>;
