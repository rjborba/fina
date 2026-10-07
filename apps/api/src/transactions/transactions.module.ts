import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transactions } from './entities/transaction.entity';
import { CreditCardBillReviews } from '../credit-card-bills/entities/credit-card-bill-review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transactions, CreditCardBillReviews])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
