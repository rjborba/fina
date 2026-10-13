import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCreditCardInput,
  CreditCardOutput,
  CreditCardQuery,
  CreditCardReference,
  UpdateCreditCardInput,
} from '@fina/types';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { CreditCards } from './entities/credit-card.entity';
import { Bankaccounts } from '../bankaccounts/entities/bankaccount.entity';
import { AuthorizationService } from '../auth/authorization.service';
import { toDateTimeOutput } from '../common/date-output';

export function toCreditCardReference(card: CreditCards): CreditCardReference {
  return {
    id: card.id,
    accountId: card.account.id,
    name: card.name,
    last4: card.last4,
    archived: card.archived,
  };
}

@Injectable()
export class CreditCardsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async create(
    userId: string,
    input: CreateCreditCardInput,
  ): Promise<CreditCardOutput> {
    const account = await this.findAccount(userId, input.accountId);
    await this.authorization.assertMember(userId, account.group.id);
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        await this.assertActiveCreditAccount(
          manager,
          account.group.id,
          account.id,
        );
        return manager.getRepository(CreditCards).save(
          manager.getRepository(CreditCards).create({
            name: input.name,
            last4: input.last4 ?? null,
            archived: false,
            account: { id: account.id },
            group: { id: account.group.id },
          }),
        );
      });
      return this.toOutput(new CreditCards({ ...saved, account }));
    } catch (error) {
      this.handleNameConflict(error);
    }
  }

  async findAll(
    userId: string,
    query: CreditCardQuery,
  ): Promise<CreditCardOutput[]> {
    await this.authorization.assertMember(userId, query.groupId);
    const builder = this.scopedQuery(userId).where('card.group_id = :groupId', {
      groupId: query.groupId,
    });
    if (query.accountId)
      builder.andWhere('card.account_id = :accountId', {
        accountId: query.accountId,
      });
    if (!query.includeArchived)
      builder
        .andWhere('card.archived = false')
        .andWhere('account.removed = false');
    return (
      await builder
        .orderBy('card.created_at', 'ASC')
        .addOrderBy('card.id', 'ASC')
        .getMany()
    ).map((card) => this.toOutput(card));
  }

  async update(
    userId: string,
    id: string,
    input: UpdateCreditCardInput,
  ): Promise<CreditCardOutput> {
    const card = await this.findEntity(userId, id);
    await this.authorization.assertMember(userId, card.group.id);
    try {
      await this.dataSource.getRepository(CreditCards).update(
        { id, group: { id: card.group.id }, archived: false },
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.last4 !== undefined ? { last4: input.last4 } : {}),
        },
      );
      return this.toOutput(await this.findEntity(userId, id));
    } catch (error) {
      this.handleNameConflict(error);
    }
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const card = await this.findEntity(userId, id);
    await this.authorization.assertMember(userId, card.group.id);
    await this.dataSource
      .getRepository(CreditCards)
      .update(
        { id, group: { id: card.group.id }, archived: false },
        { archived: true },
      );
    return { id };
  }

  async assertAssignment(
    manager: EntityManager,
    groupId: string,
    accountId: string | null,
    cardId: string | null | undefined,
  ): Promise<CreditCards | null> {
    if (!cardId) return null;
    if (!accountId) throw new NotFoundException('Resource not found');
    await this.assertActiveCreditAccount(manager, groupId, accountId);
    const card = await manager
      .getRepository(CreditCards)
      .createQueryBuilder('card')
      .innerJoinAndSelect('card.account', 'account')
      .where(
        'card.id = :cardId AND card.group_id = :groupId AND card.account_id = :accountId AND card.archived = false',
        { cardId, groupId, accountId },
      )
      .setLock('pessimistic_read', undefined, ['card'])
      .getOne();
    if (!card) throw new NotFoundException('Resource not found');
    return card;
  }

  private async assertActiveCreditAccount(
    manager: EntityManager,
    groupId: string,
    accountId: string,
  ): Promise<void> {
    const account = await manager
      .getRepository(Bankaccounts)
      .createQueryBuilder('account')
      .where(
        'account.id = :accountId AND account.group_id = :groupId AND account.removed = false',
        { accountId, groupId },
      )
      .setLock('pessimistic_read')
      .getOne();
    if (!account) throw new NotFoundException('Resource not found');
    if (account.type !== 'credit')
      throw new BadRequestException(
        'Individual cards require a credit account',
      );
  }

  private scopedQuery(userId: string) {
    return this.dataSource
      .getRepository(CreditCards)
      .createQueryBuilder('card')
      .innerJoinAndSelect('card.group', 'group_record')
      .innerJoinAndSelect(
        'card.account',
        'account',
        'account.group_id = card.group_id',
      )
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      );
  }

  private async findEntity(userId: string, id: string): Promise<CreditCards> {
    const card = await this.scopedQuery(userId)
      .where('card.id = :id', { id })
      .andWhere('card.archived = false')
      .andWhere('account.removed = false')
      .getOne();
    if (!card) throw new NotFoundException('Resource not found');
    return card;
  }

  private async findAccount(userId: string, id: string): Promise<Bankaccounts> {
    const account = await this.dataSource
      .getRepository(Bankaccounts)
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
    if (account.type !== 'credit')
      throw new BadRequestException(
        'Individual cards require a credit account',
      );
    return account;
  }

  private toOutput(card: CreditCards): CreditCardOutput {
    return {
      ...toCreditCardReference(card),
      createdAt: toDateTimeOutput(card.createdAt),
      groupId: card.group.id,
      accountName: card.account.name,
    };
  }

  private handleNameConflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string; constraint?: string }).code ===
        '23505' &&
      (error.driverError as { constraint?: string }).constraint ===
        'credit_cards_active_name_unique'
    ) {
      throw new ConflictException({
        code: 'CREDIT_CARD_NAME_CONFLICT',
        message:
          'An active card with this nickname already exists in this account',
      });
    }
    throw error;
  }
}
