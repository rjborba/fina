import { CreateBankaccountInputDto } from '@fina/types';
import { Injectable } from '@nestjs/common';
import { Bankaccounts } from './entities/bankaccount.entity';
import { Groups } from 'src/groups/entities/group.entity';
import { Users } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BankaccountsService {
  constructor(
    @InjectRepository(Bankaccounts)
    private readonly bankaccountRepository: Repository<Bankaccounts>,
  ) {}

  create(createBankaccountDto: CreateBankaccountInputDto) {
    const bankaccountEntity = new Bankaccounts({
      name: createBankaccountDto.name,
      type: createBankaccountDto.type,
      dueDate: createBankaccountDto.dueDate || null,
      group: { id: createBankaccountDto.groupId } as Groups,
      user: { id: createBankaccountDto.userId } as Users,
    });

    return this.bankaccountRepository.save(bankaccountEntity);
  }

  findAll(groupId: string) {
    return this.bankaccountRepository.find({
      where: { group: { id: groupId } },
      relations: ['group', 'user'],
    });
  }

  remove(id: string) {
    return this.bankaccountRepository.delete(id);
  }
}
