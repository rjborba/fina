import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Repository } from 'typeorm';
import { Transactions } from './entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
  ) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const item = new Transactions(createTransactionDto);
    await this.transactionRepository.save(item);
  }

  findAll({ groupId }: { groupId: string }) {
    return this.transactionRepository.find({
      relations: ['category', 'bankaccount', 'group', 'import'],
      where: {
        group: {
          id: groupId,
        },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return this.transactionRepository.update(id, updateTransactionDto);
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
