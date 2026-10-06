import { BankaccountOutput, CreateBankaccountInputDto } from '@fina/types';
import { Injectable } from '@nestjs/common';
import { Bankaccounts } from './entities/bankaccount.entity';
import { Groups } from 'src/groups/entities/group.entity';
import { Users } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { NotFoundException } from '@nestjs/common';
import { toDateTimeOutput } from '../common/date-output';

@Injectable()
export class BankaccountsService {
  constructor(
    @InjectRepository(Bankaccounts)
    private readonly bankaccountRepository: Repository<Bankaccounts>,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    createBankaccountDto: CreateBankaccountInputDto,
  ): Promise<BankaccountOutput> {
    await this.authorization.assertMember(userId, createBankaccountDto.groupId);
    const bankaccountEntity = new Bankaccounts({
      name: createBankaccountDto.name,
      type: createBankaccountDto.type,
      dueDate: createBankaccountDto.dueDate,
      removed: false,
      group: { id: createBankaccountDto.groupId } as Groups,
      user: { id: userId } as Users,
    });

    const saved = await this.bankaccountRepository.save(bankaccountEntity);
    return this.toOutput(saved);
  }

  async findAll(userId: string, groupId: string): Promise<BankaccountOutput[]> {
    await this.authorization.assertMember(userId, groupId);
    const accounts = await this.bankaccountRepository
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.group', 'group_record')
      .innerJoinAndSelect('account.user', 'assigned_user')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('group_record.id = :groupId', { groupId })
      .andWhere('account.removed = false')
      .orderBy('account.created_at', 'ASC')
      .getMany();
    return accounts.map((account) => this.toOutput(account));
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const account = await this.bankaccountRepository
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('account.id = :id', { id })
      .andWhere('account.removed = false')
      .getOne();
    if (!account) throw new NotFoundException('Resource not found');
    await this.bankaccountRepository.update(
      {
        id,
        group: { id: account.group.id },
      },
      { removed: true },
    );
    return { id };
  }

  private toOutput(account: Bankaccounts): BankaccountOutput {
    return {
      id: account.id,
      createdAt: toDateTimeOutput(account.createdAt),
      name: account.name,
      type: account.type,
      dueDate: account.dueDate,
      groupId: account.group.id,
      userId: account.user.id,
    };
  }
}
