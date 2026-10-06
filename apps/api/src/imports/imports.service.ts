import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateImportInputDto,
  ImportProfile,
  ImportSummary,
  PreviewImportOutput,
} from '@fina/types';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuthorizationService } from '../auth/authorization.service';
import { Bankaccounts } from '../bankaccounts/entities/bankaccount.entity';
import { toDateTimeOutput, toNullableDateOutput } from '../common/date-output';
import { deriveBillDueDate } from '../common/bill-date';
import { Groups } from '../groups/entities/group.entity';
import { Transactions } from '../transactions/entities/transaction.entity';
import { ImportProfiles } from './entities/import-profile.entity';
import { Imports } from './entities/import.entity';
import { ImportFiles } from './entities/import-file.entity';

export type UploadedImportFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(Imports)
    private readonly imports: Repository<Imports>,
    @InjectRepository(ImportProfiles)
    private readonly profiles: Repository<ImportProfiles>,
    @InjectRepository(Bankaccounts)
    private readonly accounts: Repository<Bankaccounts>,
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async preview(
    userId: string,
    input: CreateImportInputDto,
  ): Promise<PreviewImportOutput> {
    const account = await this.assertDestination(
      userId,
      input.groupId,
      input.accountId,
    );
    this.resolveBillDueDate(account, input.billMonth);
    const duplicate = await this.findDuplicate(
      input.groupId,
      input.accountId,
      input.fileHash,
    );
    return {
      valid: duplicate === null,
      summary: this.summarize(input),
      issues: [],
      duplicate,
    };
  }

  async create(
    userId: string,
    input: CreateImportInputDto,
    file: UploadedImportFile | undefined,
  ): Promise<ImportSummary> {
    const fileContent = this.verifyFile(input, file);
    const account = await this.assertDestination(
      userId,
      input.groupId,
      input.accountId,
    );
    const billDueDate = this.resolveBillDueDate(account, input.billMonth);
    const duplicate = await this.findDuplicate(
      input.groupId,
      input.accountId,
      input.fileHash,
    );
    if (duplicate) this.throwDuplicate(duplicate);

    const summary = this.summarize(input);
    try {
      const savedId = await this.dataSource.transaction(async (manager) => {
        const importRecord = await manager.getRepository(Imports).save(
          manager.getRepository(Imports).create({
            fileName: input.fileName,
            fileHash: input.fileHash,
            fileSize: String(input.fileSize),
            sourceFingerprint: input.sourceFingerprint,
            configVersion: input.config.version,
            mappingConfig: input.config,
            transactionCount: input.rows.length,
            excludedRowCount: input.excludedRowCount,
            dateStart: summary.dateStart,
            dateEnd: summary.dateEnd,
            billDueDate,
            inflowTotal: summary.inflowTotal,
            outflowTotal: summary.outflowTotal,
            removed: false,
            group: { id: input.groupId } as Groups,
            account: { id: input.accountId } as Bankaccounts,
          }),
        );

        await manager.getRepository(ImportFiles).save(
          manager.getRepository(ImportFiles).create({
            importId: importRecord.id,
            content: fileContent,
            import: importRecord,
          }),
        );

        const transactions = input.rows.map((row) =>
          manager.getRepository(Transactions).create({
            sourceRow: row.sourceRow,
            description: row.description,
            value: row.amount,
            date: row.date,
            calculatedDate: row.date,
            creditDueDate: billDueDate,
            toBeConsideredAt: billDueDate,
            installmentCurrent:
              row.installmentCurrent === null
                ? null
                : String(row.installmentCurrent),
            installmentTotal: row.installmentTotal,
            observation: null,
            removed: false,
            bankaccount: { id: input.accountId } as Bankaccounts,
            category: null,
            group: { id: input.groupId } as Groups,
            import: { id: importRecord.id } as Imports,
          }),
        );
        await manager.getRepository(Transactions).save(transactions);

        await manager.query(
          `INSERT INTO public.import_profiles (
             group_id, account_id, source_fingerprint,
             config_version, mapping_config
           ) VALUES ($1, $2, $3, $4, $5::jsonb)
           ON CONFLICT (group_id, account_id, source_fingerprint)
           DO UPDATE SET
             config_version = EXCLUDED.config_version,
             mapping_config = EXCLUDED.mapping_config,
             updated_at = now()`,
          [
            input.groupId,
            input.accountId,
            input.sourceFingerprint,
            input.config.version,
            JSON.stringify(input.config),
          ],
        );
        return importRecord.id;
      });
      return this.findOne(userId, savedId);
    } catch (error) {
      if (this.isDuplicateConstraint(error)) {
        const concurrentDuplicate = await this.findDuplicate(
          input.groupId,
          input.accountId,
          input.fileHash,
        );
        if (concurrentDuplicate) this.throwDuplicate(concurrentDuplicate);
      }
      throw error;
    }
  }

  private verifyFile(
    input: CreateImportInputDto,
    file: UploadedImportFile | undefined,
  ): Buffer {
    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }
    if (
      !file.originalname.toLocaleLowerCase().endsWith('.csv') ||
      ![
        '',
        'text/csv',
        'text/plain',
        'application/vnd.ms-excel',
        'application/octet-stream',
      ].includes(file.mimetype)
    ) {
      throw new BadRequestException('The uploaded file must be a CSV file');
    }
    if (
      file.originalname !== input.fileName ||
      file.size !== input.fileSize ||
      file.buffer.length !== input.fileSize
    ) {
      throw new BadRequestException(
        'The uploaded file does not match its metadata',
      );
    }
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    if (hash !== input.fileHash) {
      throw new BadRequestException(
        'The uploaded file does not match its SHA-256 hash',
      );
    }
    return file.buffer;
  }

  async findProfiles(
    userId: string,
    groupId: string,
    fingerprint: string,
  ): Promise<ImportProfile[]> {
    await this.authorization.assertMember(userId, groupId);
    const profiles = await this.profiles
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.account', 'account')
      .innerJoin('profile.group', 'group_record')
      .where('group_record.id = :groupId', { groupId })
      .andWhere('profile.source_fingerprint = :fingerprint', { fingerprint })
      .andWhere('account.removed = false')
      .orderBy('profile.updated_at', 'DESC')
      .getMany();
    return profiles.map((profile) => ({
      id: profile.id,
      accountId: profile.account.id,
      accountName: profile.account.name,
      accountType: profile.account.type,
      sourceFingerprint: profile.sourceFingerprint.trim(),
      config: profile.mappingConfig,
      updatedAt: toDateTimeOutput(profile.updatedAt),
    }));
  }

  async findAll(userId: string, groupId: string): Promise<ImportSummary[]> {
    await this.authorization.assertMember(userId, groupId);
    const imports = await this.imports.find({
      where: { group: { id: groupId }, removed: false },
      relations: { group: true, account: true },
      order: { createdAt: 'DESC' },
    });
    return imports.map((item) => this.toSummary(item));
  }

  async findOne(userId: string, id: string): Promise<ImportSummary> {
    const importRecord = await this.imports
      .createQueryBuilder('import_record')
      .innerJoinAndSelect('import_record.group', 'group_record')
      .innerJoinAndSelect('import_record.account', 'account')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('import_record.id = :id', { id })
      .andWhere('import_record.removed = false')
      .getOne();
    if (!importRecord) throw new NotFoundException('Resource not found');
    return this.toSummary(importRecord);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const importRecord = await this.imports
      .createQueryBuilder('import_record')
      .innerJoinAndSelect('import_record.group', 'group_record')
      .innerJoin(
        'group_record.userGroups',
        'membership',
        'membership.user_id = :userId',
        { userId },
      )
      .where('import_record.id = :id', { id })
      .andWhere('import_record.removed = false')
      .getOne();
    if (!importRecord) throw new NotFoundException('Resource not found');
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Transactions)
        .update(
          { import: { id }, group: { id: importRecord.group.id } },
          { removed: true },
        );
      await manager
        .getRepository(Imports)
        .update(
          { id, group: { id: importRecord.group.id } },
          { removed: true },
        );
    });
    return { id };
  }

  private async assertDestination(
    userId: string,
    groupId: string,
    accountId: string,
  ): Promise<Bankaccounts> {
    await this.authorization.assertMember(userId, groupId);
    const account = await this.accounts.findOne({
      where: { id: accountId, group: { id: groupId }, removed: false },
      relations: { group: true },
    });
    if (!account) throw new NotFoundException('Resource not found');
    return account;
  }

  private resolveBillDueDate(
    account: Bankaccounts,
    billMonth: string | null,
  ): string | null {
    if (account.type === 'credit' && billMonth === null) {
      throw new BadRequestException(
        'Bill month is required for credit card imports',
      );
    }
    if (account.type !== 'credit' && billMonth !== null) {
      throw new BadRequestException(
        'Bill month is only allowed for credit card imports',
      );
    }
    if (account.type !== 'credit') return null;
    if (!account.dueDate) {
      throw new BadRequestException(
        'Credit card account must have a configured due day',
      );
    }
    return deriveBillDueDate(account.dueDate, billMonth as string);
  }

  private summarize(input: CreateImportInputDto) {
    const dates = input.rows.map((row) => row.date).sort();
    const inflows = input.rows.filter((row) => row.amount > 0);
    const outflows = input.rows.filter((row) => row.amount < 0);
    return {
      includedRowCount: input.rows.length,
      excludedRowCount: input.excludedRowCount,
      errorCount: 0,
      warningCount: input.rows.filter((row) => row.description === null).length,
      dateStart: dates[0] ?? null,
      dateEnd: dates.at(-1) ?? null,
      inflowCount: inflows.length,
      inflowTotal: this.roundMoney(
        inflows.reduce((total, row) => total + row.amount, 0),
      ),
      outflowCount: outflows.length,
      outflowTotal: this.roundMoney(
        outflows.reduce((total, row) => total + row.amount, 0),
      ),
    };
  }

  private async findDuplicate(
    groupId: string,
    accountId: string,
    fileHash: string,
  ) {
    const duplicate = await this.imports.findOne({
      where: {
        group: { id: groupId },
        account: { id: accountId },
        fileHash,
        removed: false,
      },
    });
    return duplicate
      ? {
          importId: duplicate.id,
          fileName: duplicate.fileName,
          createdAt: toDateTimeOutput(duplicate.createdAt),
        }
      : null;
  }

  private throwDuplicate(duplicate: {
    importId: string;
    fileName: string;
    createdAt: string;
  }): never {
    throw new ConflictException({
      code: 'DUPLICATE_IMPORT',
      message: 'This file has already been imported into the selected account',
      details: duplicate,
    });
  }

  private isDuplicateConstraint(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as {
      code?: unknown;
      constraint?: unknown;
    };
    return (
      driverError.code === '23505' &&
      driverError.constraint === 'imports_active_file_unique'
    );
  }

  private toSummary(importRecord: Imports): ImportSummary {
    return {
      id: importRecord.id,
      createdAt: toDateTimeOutput(importRecord.createdAt),
      fileName: importRecord.fileName,
      groupId: importRecord.group.id,
      accountId: importRecord.account.id,
      accountName: importRecord.account.name,
      billDueDate: toNullableDateOutput(importRecord.billDueDate),
      transactionCount: importRecord.transactionCount,
      excludedRowCount: importRecord.excludedRowCount,
      dateStart: toNullableDateOutput(importRecord.dateStart),
      dateEnd: toNullableDateOutput(importRecord.dateEnd),
    };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
