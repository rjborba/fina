import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  description?: string;
  value?: number;
  date?: Date;
  installmentTotal?: number;
  installmentCurrent?: string;
  creditDueDate?: string;
  observation?: string;
  removed?: boolean;
  toBeConsideredAt?: string;
  calculatedDate?: string;
  bankaccountId: number;
  categoryId: number;
  groupId: number;
  importId?: number;
}
