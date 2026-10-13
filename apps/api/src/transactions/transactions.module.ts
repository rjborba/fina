import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transactions } from './entities/transaction.entity';
import { CreditCardBillReviews } from '../credit-card-bills/entities/credit-card-bill-review.entity';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transactions, CreditCardBillReviews]),
    CreditCardsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
