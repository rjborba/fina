import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '../transactions/transactions.module';
import { CreditCardBillsController } from './credit-card-bills.controller';
import { CreditCardBillsService } from './credit-card-bills.service';
import { CreditCardBillReconciliations } from './entities/credit-card-bill-reconciliation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditCardBillReconciliations]),
    TransactionsModule,
  ],
  controllers: [CreditCardBillsController],
  providers: [CreditCardBillsService],
})
export class CreditCardBillsModule {}
