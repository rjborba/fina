export class CreateTransactionDto {
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
