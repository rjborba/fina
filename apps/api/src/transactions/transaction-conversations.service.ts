import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionConversation } from '@fina/types';
import { DataSource, EntityManager } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { Transactions } from './entities/transaction.entity';
import { toDateTimeOutput } from '../common/date-output';

export async function appendTransactionComment(
  manager: EntityManager,
  transactionId: string,
  groupId: string,
  userId: string,
  body: string,
): Promise<void> {
  await manager.query(
    'INSERT INTO public.transaction_comments (transaction_id, group_id, author_id, body) VALUES ($1, $2, $3, $4)',
    [transactionId, groupId, userId, body],
  );
  await manager
    .getRepository(Transactions)
    .increment(
      { id: transactionId, group: { id: groupId } },
      'commentCount',
      1,
    );
  await manager
    .getRepository(Transactions)
    .update(
      { id: transactionId, group: { id: groupId } },
      { conversationResolved: false },
    );
}

@Injectable()
export class TransactionConversationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async read(userId: string, id: string): Promise<TransactionConversation> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const transaction = await this.findTransaction(
        manager,
        userId,
        id,
        false,
      );
      return this.output(manager, transaction);
    });
  }

  async add(
    userId: string,
    id: string,
    body: string,
  ): Promise<TransactionConversation> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.findTransaction(manager, userId, id, true);
      await appendTransactionComment(
        manager,
        id,
        transaction.group.id,
        userId,
        body,
      );
      transaction.conversationResolved = false;
      return this.output(manager, transaction);
    });
  }

  async resolve(
    userId: string,
    id: string,
    resolved: boolean,
  ): Promise<TransactionConversation> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.findTransaction(manager, userId, id, true);
      if (!transaction.commentCount)
        throw new BadRequestException({
          code: 'EMPTY_CONVERSATION',
          message: 'Add a comment before resolving the conversation',
        });
      await manager
        .getRepository(Transactions)
        .update(
          { id, group: { id: transaction.group.id }, removed: false },
          { conversationResolved: resolved },
        );
      transaction.conversationResolved = resolved;
      return this.output(manager, transaction);
    });
  }

  private async findTransaction(
    manager: EntityManager,
    userId: string,
    id: string,
    lock: boolean,
  ): Promise<Transactions> {
    const query = manager
      .getRepository(Transactions)
      .createQueryBuilder('transaction')
      .innerJoinAndSelect('transaction.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('transaction.id = :id', { id })
      .andWhere('transaction.removed IS NOT TRUE');
    if (lock) query.setLock('pessimistic_write', undefined, ['transaction']);
    const transaction = await query.getOne();
    if (!transaction) throw new NotFoundException('Resource not found');
    await this.authorization.assertMember(
      userId,
      transaction.group.id,
      manager,
    );
    return transaction;
  }

  private async output(
    manager: EntityManager,
    transaction: Transactions,
  ): Promise<TransactionConversation> {
    const messages = await manager.query<
      Array<{
        id: string;
        body: string;
        created_at: Date;
        author_id: string | null;
        author_name: string | null;
      }>
    >(
      `SELECT c.id, c.body, c.created_at, c.author_id, u.name AS author_name
       FROM public.transaction_comments c LEFT JOIN public.users u ON u.id = c.author_id
       WHERE c.group_id = $1 AND c.transaction_id = $2 ORDER BY c.id`,
      [transaction.group.id, transaction.id],
    );
    return {
      transactionId: transaction.id,
      resolved: transaction.conversationResolved,
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: toDateTimeOutput(message.created_at),
        author: message.author_id
          ? { id: message.author_id, name: message.author_name }
          : null,
      })),
    };
  }
}
