import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Imports } from './entities/import.entity';
import { Transactions } from '../transactions/entities/transaction.entity';
import { Bankaccounts } from '../bankaccounts/entities/bankaccount.entity';
import { ImportProfiles } from './entities/import-profile.entity';
import { ImportFiles } from './entities/import-file.entity';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';

@Module({
  imports: [
    CreditCardsModule,
    TypeOrmModule.forFeature([
      Imports,
      ImportFiles,
      ImportProfiles,
      Transactions,
      Bankaccounts,
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
