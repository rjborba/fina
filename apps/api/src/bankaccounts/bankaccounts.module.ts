import { Module } from '@nestjs/common';
import { BankaccountsService } from './bankaccounts.service';
import { BankaccountsController } from './bankaccounts.controller';

@Module({
  controllers: [BankaccountsController],
  providers: [BankaccountsService],
})
export class BankaccountsModule {}
