import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Imports } from './entities/import.entity';
import { Repository } from 'typeorm';
import { CreateImportInputDto } from '@fina/types';
import { Transactions } from 'src/transactions/entities/transaction.entity';
import { Bankaccounts } from 'src/bankaccounts/entities/bankaccount.entity';
import { Categories } from 'src/categories/entities/category.entity';
import { Groups } from 'src/groups/entities/group.entity';

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(Imports)
    private readonly importRepository: Repository<Imports>,
  ) {}

  async create(createImportDto: CreateImportInputDto) {
    // Create the transactions
    const transactions = createImportDto.transactions.map(
      (transactionDto) =>
        new Transactions({
          description: transactionDto.description,
          value: transactionDto.value,
          date: transactionDto.date,
          calculatedDate: transactionDto.calculatedDate,
          creditDueDate: transactionDto.creditDueDate,
          toBeConsideredAt: transactionDto.toBeConsideredAt,
          installmentCurrent: transactionDto.installmentCurrent,
          installmentTotal: transactionDto.installmentTotal,
          observation: transactionDto.observation,
          bankaccount: { id: transactionDto.bankaccountId } as Bankaccounts,
          category: transactionDto.categoryId
            ? ({ id: transactionDto.categoryId } as Categories)
            : null,
          group: { id: transactionDto.groupId } as Groups,
        }),
    );

    // Create the import with its transactions in one go
    const importEntity = new Imports({
      fileName: createImportDto.fileName,
      group: { id: createImportDto.groupId } as Groups,
      transactions,
    });

    // Save the import with cascading - TypeORM will automatically save the transactions
    return await this.importRepository.save(importEntity);
  }

  findAll(groupId: string) {
    return this.importRepository.find({
      where: {
        group: {
          id: groupId,
        },
      },
    });
  }

  findOne(id: string) {
    return this.importRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });
  }

  // update(id: number, updateImportDto: UpdateImportDto) {
  //   return `This action updates a #${id} import`;
  // }

  remove(id: string) {
    return `This action removes a #${id} import`;
  }
}
