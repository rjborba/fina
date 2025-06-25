import { PartialType } from '@nestjs/mapped-types';
import { CreateBankaccountDto } from './create-bankaccount.dto';

export class UpdateBankaccountDto extends PartialType(CreateBankaccountDto) {
  name: string;
  type: string;
  dueDate?: string | null;
}
