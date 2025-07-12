import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Imports } from './entities/import.entity';
import { Transactions } from '../transactions/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Imports, Transactions])],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
