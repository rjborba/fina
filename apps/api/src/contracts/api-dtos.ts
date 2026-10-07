import {
  AcceptInviteOutputSchema,
  BankaccountListOutputSchema,
  BankaccountOutputSchema,
  CategoryListOutputSchema,
  CategoryOutputSchema,
  CreateBankaccountInputDtoSchema,
  CreateCategoryInputDtoSchema,
  CreditCardBillDetailSchema,
  CreditCardBillListOutputSchema,
  CreditCardBillListQuerySchema,
  CreditCardBillParamsSchema,
  CreditCardBillQuerySchema,
  CreditCardBillSummarySchema,
  CreateGroupInputSchema,
  CreateImportInputDtoSchema,
  CreateInviteInputSchema,
  CreateTransactionInputDtoSchema,
  DeleteBankaccountOutputSchema,
  DeleteCategoryOutputSchema,
  DeleteGroupInputSchema,
  DeleteGroupOutputSchema,
  DeleteImportOutputSchema,
  DeleteInviteOutputSchema,
  DeleteTransactionOutputSchema,
  GroupListOutputSchema,
  GroupMemberListOutputSchema,
  GroupMemberSchema,
  GroupOutputSchema,
  GroupQueryInputSchema,
  IdParamSchema,
  ImportListOutputSchema,
  ImportProfileListOutputSchema,
  ImportProfileSchema,
  ImportProfileQuerySchema,
  ImportSummarySchema,
  InviteListOutputSchema,
  InviteOutputSchema,
  QueryBankaccountInputDtoSchema,
  QueryCategoryInputDtoSchema,
  QueryTransactionInputDtoSchema,
  QueryTransactionOutputDtoSchema,
  ReconcileCreditCardBillInputSchema,
  PreviewImportInputDtoSchema,
  PreviewImportOutputSchema,
  TransactionOutputSchema,
  UpdateCategoryAppearanceInputDtoSchema,
  UpdateTransactionInputDtoSchema,
  UnlinkCreditCardBillOutputSchema,
  UpdateCreditCardBillReviewMonthInputSchema,
  UpdateGroupReviewSettingsInputSchema,
} from '@fina/types';
import { createZodDto } from 'nestjs-zod';

export class GroupOutputDto extends createZodDto(GroupOutputSchema) {}
export class UpdateGroupReviewSettingsInputDto extends createZodDto(
  UpdateGroupReviewSettingsInputSchema,
) {}
export class UpdateCreditCardBillReviewMonthInputDto extends createZodDto(
  UpdateCreditCardBillReviewMonthInputSchema,
) {}
export class GroupListOutputDto extends createZodDto(GroupListOutputSchema) {}
export class CreateGroupInputDto extends createZodDto(CreateGroupInputSchema) {}
export class DeleteGroupInputDto extends createZodDto(DeleteGroupInputSchema) {}
export class DeleteGroupOutputDto extends createZodDto(
  DeleteGroupOutputSchema,
) {}
export class IdParamDto extends createZodDto(IdParamSchema) {}
export class GroupQueryInputDto extends createZodDto(GroupQueryInputSchema) {}

export class CreateBankaccountInputDto extends createZodDto(
  CreateBankaccountInputDtoSchema,
) {}
export class BankaccountOutputDto extends createZodDto(
  BankaccountOutputSchema,
) {}
export class BankaccountListOutputDto extends createZodDto(
  BankaccountListOutputSchema,
) {}
export class DeleteBankaccountOutputDto extends createZodDto(
  DeleteBankaccountOutputSchema,
) {}
export class QueryBankaccountInputDto extends createZodDto(
  QueryBankaccountInputDtoSchema,
) {}

export class CreateCategoryInputDto extends createZodDto(
  CreateCategoryInputDtoSchema,
) {}
export class CategoryOutputDto extends createZodDto(CategoryOutputSchema) {}
export class CategoryListOutputDto extends createZodDto(
  CategoryListOutputSchema,
) {}
export class DeleteCategoryOutputDto extends createZodDto(
  DeleteCategoryOutputSchema,
) {}
export class QueryCategoryInputDto extends createZodDto(
  QueryCategoryInputDtoSchema,
) {}
export class UpdateCategoryAppearanceInputDto extends createZodDto(
  UpdateCategoryAppearanceInputDtoSchema,
) {}

export class CreateImportInputDto extends createZodDto(
  CreateImportInputDtoSchema,
) {}
export class PreviewImportInputDto extends createZodDto(
  PreviewImportInputDtoSchema,
) {}
export class PreviewImportOutputDto extends createZodDto(
  PreviewImportOutputSchema,
) {}
export class ImportOutputDto extends createZodDto(ImportSummarySchema) {}
export class ImportListOutputDto extends createZodDto(ImportListOutputSchema) {}
export class ImportProfileQueryDto extends createZodDto(
  ImportProfileQuerySchema,
) {}
export class ImportProfileListOutputDto extends createZodDto(
  ImportProfileListOutputSchema,
) {}
export class ImportProfileOutputDto extends createZodDto(ImportProfileSchema) {}
export class DeleteImportOutputDto extends createZodDto(
  DeleteImportOutputSchema,
) {}

export class CreateInviteInputDto extends createZodDto(
  CreateInviteInputSchema,
) {}
export class InviteOutputDto extends createZodDto(InviteOutputSchema) {}
export class InviteListOutputDto extends createZodDto(InviteListOutputSchema) {}
export class DeleteInviteOutputDto extends createZodDto(
  DeleteInviteOutputSchema,
) {}
export class AcceptInviteOutputDto extends createZodDto(
  AcceptInviteOutputSchema,
) {}

export class CreateTransactionInputDto extends createZodDto(
  CreateTransactionInputDtoSchema,
) {}
export class TransactionOutputDto extends createZodDto(
  TransactionOutputSchema,
) {}
export class QueryTransactionInputDto extends createZodDto(
  QueryTransactionInputDtoSchema,
) {}
export class QueryTransactionOutputDto extends createZodDto(
  QueryTransactionOutputDtoSchema,
) {}
export class UpdateTransactionInputDto extends createZodDto(
  UpdateTransactionInputDtoSchema,
) {}
export class DeleteTransactionOutputDto extends createZodDto(
  DeleteTransactionOutputSchema,
) {}

export class CreditCardBillListQueryDto extends createZodDto(
  CreditCardBillListQuerySchema,
) {}
export class CreditCardBillListOutputDto extends createZodDto(
  CreditCardBillListOutputSchema,
) {}
export class CreditCardBillSummaryDto extends createZodDto(
  CreditCardBillSummarySchema,
) {}
export class CreditCardBillParamsDto extends createZodDto(
  CreditCardBillParamsSchema,
) {}
export class CreditCardBillQueryDto extends createZodDto(
  CreditCardBillQuerySchema,
) {}
export class CreditCardBillDetailDto extends createZodDto(
  CreditCardBillDetailSchema,
) {}
export class ReconcileCreditCardBillInputDto extends createZodDto(
  ReconcileCreditCardBillInputSchema,
) {}
export class UnlinkCreditCardBillOutputDto extends createZodDto(
  UnlinkCreditCardBillOutputSchema,
) {}

export class GroupMemberListOutputDto extends createZodDto(
  GroupMemberListOutputSchema,
) {}
export class GroupMemberOutputDto extends createZodDto(GroupMemberSchema) {}
