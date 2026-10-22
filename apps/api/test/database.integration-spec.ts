import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { Server } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { InitialSchema1789960612000 } from '../src/database/migrations/1789960612000-InitialSchema';
import { ProvisionInitialGroup1790104136223 } from '../src/database/migrations/1790104136223-ProvisionInitialGroup';
import { ImportSystem1790110800000 } from '../src/database/migrations/1790110800000-ImportSystem';
import { StoreImportFiles1790280000000 } from '../src/database/migrations/1790280000000-StoreImportFiles';
import { CategoryAppearance1790553422000 } from '../src/database/migrations/1790553422000-CategoryAppearance';
import { ExpandCategoryAppearance1790555400000 } from '../src/database/migrations/1790555400000-ExpandCategoryAppearance';
import { GroupOwnedTransactions1790557104292 } from '../src/database/migrations/1790557104292-GroupOwnedTransactions';
import { BackfillTransactionGroups1790559700000 } from '../src/database/migrations/1790559700000-BackfillTransactionGroups';
import { AddImportBillDueDate1790562000000 } from '../src/database/migrations/1790562000000-AddImportBillDueDate';
import { CreditCardBillReconciliation1790650000000 } from '../src/database/migrations/1790650000000-CreditCardBillReconciliation';
import { AddCreditCardBillAttribution1790730000000 } from '../src/database/migrations/1790730000000-AddCreditCardBillAttribution';
import { StoreBankAccountDueDay1790810000000 } from '../src/database/migrations/1790810000000-StoreBankAccountDueDay';
import { RemoveCreditCardBillAttribution1790900000000 } from '../src/database/migrations/1790900000000-RemoveCreditCardBillAttribution';
import { AddMonthlyReview1791000000000 } from '../src/database/migrations/1791000000000-AddMonthlyReview';
import { CorrectImportedAmountSigns1791100000000 } from '../src/database/migrations/1791100000000-CorrectImportedAmountSigns';
import { BankAccountInstitution1791200000000 } from '../src/database/migrations/1791200000000-BankAccountInstitution';
import { IndividualCreditCards1791300000000 } from '../src/database/migrations/1791300000000-IndividualCreditCards';
import { DeriveMonthlyReview1792034936757 } from '../src/database/migrations/1792034936757-DeriveMonthlyReview';
import { TransactionCardMetadata1792459849364 } from '../src/database/migrations/1792459849364-TransactionCardMetadata';
import { BackfillImportedCardMetadata1792501867419 } from '../src/database/migrations/1792501867419-BackfillImportedCardMetadata';
import { TransactionsService } from '../src/transactions/transactions.service';
import { ConfigService } from '@nestjs/config';
import {
  BankaccountOutput,
  CreditCardBillDetail,
  CreditCardBillSummary,
  CardMetadata,
  cardMetadataKey,
  PreviewImportOutput,
  FinancialInstitutionId,
  ImportProfile,
  ImportSummary,
  TransactionOutput,
} from '@fina/types';

import { TransactionFlags1792503000000 } from '../src/database/migrations/1792503000000-TransactionFlags';
import { WorkspaceCustomValues1792620000000 } from '../src/database/migrations/1792620000000-WorkspaceCustomValues';
import { CustomValue, evaluateCustomValues } from '@fina/types';

const migrations = [
  InitialSchema1789960612000,
  ProvisionInitialGroup1790104136223,
  ImportSystem1790110800000,
  StoreImportFiles1790280000000,
  CategoryAppearance1790553422000,
  ExpandCategoryAppearance1790555400000,
  GroupOwnedTransactions1790557104292,
  BackfillTransactionGroups1790559700000,
  AddImportBillDueDate1790562000000,
  CreditCardBillReconciliation1790650000000,
  AddCreditCardBillAttribution1790730000000,
  StoreBankAccountDueDay1790810000000,
  RemoveCreditCardBillAttribution1790900000000,
  AddMonthlyReview1791000000000,
  CorrectImportedAmountSigns1791100000000,
  BankAccountInstitution1791200000000,
  IndividualCreditCards1791300000000,
  DeriveMonthlyReview1792034936757,
  TransactionCardMetadata1792459849364,
  BackfillImportedCardMetadata1792501867419,
  TransactionFlags1792503000000,
  WorkspaceCustomValues1792620000000,
];

const legacyInstitutionAccounts: Array<{
  name: string;
  institutionId: FinancialInstitutionId | null;
}> = [
  { name: 'Banco Inter main account', institutionId: 'inter' },
  { name: 'Itau\u0301 Personnalité', institutionId: 'itau' },
  { name: 'Nubank card', institutionId: 'nubank' },
  { name: 'BB checking', institutionId: 'banco-do-brasil' },
  { name: 'Caixa Econômica Federal', institutionId: 'caixa' },
  { name: 'Bradesco Visa', institutionId: 'bradesco' },
  { name: 'Santander checking', institutionId: 'santander' },
  { name: 'C-6 card', institutionId: 'c6' },
  { name: 'BTG Pactual', institutionId: 'btg-pactual' },
  { name: 'Banco Safra', institutionId: 'safra' },
  { name: 'Sicredi card', institutionId: 'sicredi' },
  { name: 'Sicoob checking', institutionId: 'sicoob' },
  { name: 'Banrisul card', institutionId: 'banrisul' },
  { name: 'Banco PAN', institutionId: 'banco-pan' },
  { name: 'Banco Votorantim', institutionId: 'banco-bv' },
  { name: 'BMG checking', institutionId: 'bmg' },
  { name: 'Neon card', institutionId: 'neon' },
  { name: 'Pic Pay checking', institutionId: 'picpay' },
  { name: 'MercadoPago card', institutionId: 'mercado-pago' },
  { name: 'PagSeguro checking', institutionId: 'pagbank' },
  { name: 'XP Visa', institutionId: 'xp' },
  { name: 'Personal account', institutionId: null },
  { name: 'internet card', institutionId: null },
  { name: 'XPTO card', institutionId: null },
  { name: 'Inter / Itaú', institutionId: null },
];

describe('backend-only PostgreSQL boundary', () => {
  const testSecret = 'local-integration-jwt-secret';
  const testUrl = 'https://fina-integration.supabase.co';
  let dataSource: DataSource;
  let app: INestApplication;
  let httpServer: Server;
  let legacyAccountSnapshot: Array<Record<string, unknown>>;
  let reviewMigrationBefore: Record<string, unknown[]>;
  let reviewMigrationAfter: Record<string, unknown[]>;
  let cardMigrationExpected: Array<{
    id: string;
    card_name: string | null;
    card_last4: string | null;
  }>;
  let cardMigrationBefore: unknown[];
  let cardMigrationSourcesBefore: unknown[];

  beforeAll(async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'TEST_DATABASE_URL is required; run integration tests through the root script',
      );
    }

    const databaseName = new URL(databaseUrl).pathname.slice(1);
    if (!databaseName.toLowerCase().includes('test')) {
      throw new Error(
        'Integration tests require a database name containing "test"',
      );
    }

    const dataSourceOptions = {
      type: 'postgres',
      url: databaseUrl,
      migrationsTableName: 'migrations',
      synchronize: false,
    } as const;

    dataSource = new DataSource({
      ...dataSourceOptions,
      migrations: [InitialSchema1789960612000],
    });
    await dataSource.initialize();

    await dataSource.query(`
      DO $roles$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
        ) THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'service_role'
        ) THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END;
      $roles$
    `);
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS auth');
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        raw_user_meta_data jsonb
      )
    `);
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid'
    `);
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION auth.email()
      RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text'
    `);

    await dataSource.runMigrations();

    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, $2, '{}'::jsonb)`,
      [
        '2fb65753-73c6-4e64-a4e6-f7fc22ee7746',
        'migration-backfill@example.com',
      ],
    );
    const [{ id: legacyGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.groups (name) VALUES ('Legacy due day') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO public.bankaccounts (
         name, type, due_date, group_id, user_id
       ) VALUES ('Legacy due-date card', 'credit', '2026-09-05', $1, $2)`,
      [legacyGroupId, '2fb65753-73c6-4e64-a4e6-f7fc22ee7746'],
    );

    await dataSource.destroy();
    dataSource = new DataSource({
      ...dataSourceOptions,
      migrations: migrations.slice(0, 13),
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    await dataSource.query(
      `INSERT INTO public.transactions (
         description, date, credit_due_date, bankaccount_id, group_id, removed
       ) SELECT 'Synthetic legacy review entry', entry.purchase_date,
           entry.due_date, account.id, account.group_id, entry.removed
         FROM public.bankaccounts account
         CROSS JOIN (VALUES
           ('2026-06-18'::date, '2026-07-05'::date, false),
           ('2026-07-01'::date, '2026-07-05'::date, false),
           ('2025-12-12'::date, '2026-01-05'::date, true)
         ) AS entry(purchase_date, due_date, removed)
         WHERE account.group_id = $1`,
      [legacyGroupId],
    );
    const [{ id: institutionGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.groups (name) VALUES ('Legacy institution branding') RETURNING id`,
    );
    for (const [index, fixture] of legacyInstitutionAccounts.entries()) {
      await dataSource.query(
        `INSERT INTO public.bankaccounts (
          name, type, due_date, removed, group_id, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01')`,
        [
          fixture.name,
          index % 2 === 0 ? 'credit' : 'checkout',
          index % 2 === 0 ? 5 : null,
          index % 3 === 0,
          institutionGroupId,
          '2fb65753-73c6-4e64-a4e6-f7fc22ee7746',
        ],
      );
    }
    legacyAccountSnapshot = await dataSource.query<
      Array<Record<string, unknown>>
    >(
      `SELECT id, name, type, due_date, removed, group_id, user_id, created_at
       FROM public.bankaccounts WHERE group_id = $1 ORDER BY id`,
      [institutionGroupId],
    );
    await dataSource.destroy();
    dataSource = new DataSource({
      ...dataSourceOptions,
      migrations: migrations.slice(0, 17),
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    await seedObsoleteReviewMetadata(legacyGroupId);
    reviewMigrationBefore = await financialMigrationSnapshot();
    await dataSource.destroy();
    dataSource = new DataSource({
      ...dataSourceOptions,
      migrations: migrations.slice(0, 18),
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    reviewMigrationAfter = await financialMigrationSnapshot();
    cardMigrationExpected = await dataSource.query<
      Array<{ id: string; card_name: string | null; card_last4: string | null }>
    >(`
      SELECT purchase.id, card.name AS card_name, card.last4 AS card_last4
      FROM public.transactions purchase LEFT JOIN public.credit_cards card ON card.id = purchase.credit_card_id
      ORDER BY purchase.id
    `);
    cardMigrationBefore = await dataSource.query<Array<{ data: unknown }>>(
      "SELECT to_jsonb(purchase) - 'credit_card_id' AS data FROM public.transactions purchase ORDER BY id",
    );
    cardMigrationSourcesBefore = await dataSource.query<
      Array<{ data: unknown }>
    >(
      'SELECT to_jsonb(source) AS data FROM public.import_files source ORDER BY import_id',
    );
    await dataSource.destroy();
    dataSource = new DataSource({ ...dataSourceOptions, migrations });
    await dataSource.initialize();
    await dataSource.runMigrations();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.DATABASE_SCHEMA = 'public';
    process.env.DATABASE_SSL = 'false';
    process.env.SUPABASE_URL = testUrl;
    process.env.SUPABASE_JWT_SECRET = testSecret;
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    const { AppModule } = await import('../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('migrates existing transactions to unflagged without changing their data', async () => {
    const [column] = await dataSource.query<
      Array<{ is_nullable: string; column_default: string }>
    >(
      `SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'flagged'`,
    );
    expect(column).toEqual({ is_nullable: 'NO', column_default: 'false' });
    const flagged = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM public.transactions WHERE flagged IS DISTINCT FROM false',
    );
    expect(flagged).toEqual([]);
  });

  it('builds the final application schema exclusively from migrations', async () => {
    const tables = await dataSource.query<Array<{ tablename: string }>>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'migrations'
      ORDER BY tablename
    `);
    expect(tables.map(({ tablename }) => tablename)).toEqual([
      'bankaccounts',
      'categories',
      'credit_card_bill_reconciliations',
      'custom_values',
      'groups',
      'import_files',
      'import_profiles',
      'imports',
      'invites',
      'transactions',
      'user_group',
      'users',
    ]);

    const migrationCount = await dataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::integer AS count FROM migrations',
    );
    expect(migrationCount[0]?.count).toBe(migrations.length);

    const columns = await dataSource.query<
      Array<{ table_name: string; column_name: string }>
    >(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (
            table_name = 'groups'
            AND column_name IN (
              'creator_id',
              'credit_card_bill_attribution'
            )
          )
          OR (table_name = 'bankaccounts' AND column_name = 'removed')
          OR (
            table_name = 'categories'
            AND column_name IN ('removed', 'icon', 'color')
          )
          OR (table_name = 'user_group' AND column_name = 'role')
          OR (
            table_name = 'imports'
            AND column_name IN ('removed', 'bill_due_date')
          )
        )
      ORDER BY table_name, column_name
    `);
    expect(columns).toEqual([
      { table_name: 'bankaccounts', column_name: 'removed' },
      { table_name: 'categories', column_name: 'color' },
      { table_name: 'categories', column_name: 'icon' },
      { table_name: 'categories', column_name: 'removed' },
      { table_name: 'imports', column_name: 'bill_due_date' },
      { table_name: 'imports', column_name: 'removed' },
      { table_name: 'user_group', column_name: 'role' },
    ]);

    const transactionReferences = await dataSource.query<
      Array<{ constraint_name: string; definition: string }>
    >(`
      SELECT constraint_record.conname AS constraint_name,
             pg_get_constraintdef(constraint_record.oid) AS definition
      FROM pg_constraint constraint_record
      WHERE constraint_record.conrelid = 'public.transactions'::regclass
        AND constraint_record.contype = 'f'
      ORDER BY constraint_record.conname
    `);
    const transactionReferenceByName = new Map(
      transactionReferences.map(({ constraint_name, definition }) => [
        constraint_name,
        definition,
      ]),
    );
    expect(
      transactionReferenceByName.get('transactions_bankaccount_id_fkey'),
    ).toContain('ON DELETE SET NULL');
    expect(
      transactionReferenceByName.get('transactions_category_id_fkey'),
    ).toContain('ON DELETE SET NULL');
    expect(
      transactionReferenceByName.get('transactions_group_id_fkey'),
    ).toContain('ON DELETE CASCADE');
    expect(
      transactionReferenceByName.get('transactions_import_id_fkey'),
    ).toContain('ON DELETE SET NULL');

    const [accountColumn] = await dataSource.query<
      Array<{ is_nullable: string }>
    >(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'bankaccount_id'
    `);
    expect(accountColumn?.is_nullable).toBe('YES');

    const [dueDayColumn] = await dataSource.query<
      Array<{ data_type: string }>
    >(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'bankaccounts'
        AND column_name = 'due_date'
    `);
    expect(dueDayColumn?.data_type).toBe('smallint');

    const [dueDayConstraint] = await dataSource.query<
      Array<{ definition: string }>
    >(`
      SELECT pg_get_constraintdef(constraint_record.oid) AS definition
      FROM pg_constraint constraint_record
      WHERE constraint_record.conrelid = 'public.bankaccounts'::regclass
        AND constraint_record.conname = 'bankaccounts_due_date_day_check'
    `);
    expect(dueDayConstraint?.definition).toContain('due_date >= 1');
    expect(dueDayConstraint?.definition).toContain('due_date <= 31');

    const [migratedCreditAccount] = await dataSource.query<
      Array<{ due_date: number }>
    >(`
      SELECT due_date
      FROM public.bankaccounts
      WHERE name = 'Legacy due-date card'
    `);
    expect(migratedCreditAccount?.due_date).toBe(5);
    const [{ assignedLegacyPurchases }] = await dataSource.query<
      Array<{ assignedLegacyPurchases: number }>
    >(`
      SELECT count(*)::integer AS "assignedLegacyPurchases"
      FROM public.transactions transaction_record
      JOIN public.groups group_record ON group_record.id = transaction_record.group_id
      WHERE group_record.name = 'Legacy due day' AND (transaction_record.card_name IS NOT NULL OR transaction_record.card_last4 IS NOT NULL)
    `);
    expect(assignedLegacyPurchases).toBe(0);
  });

  it('copies all existing card attribution before dropping the entity without changing financial records', async () => {
    expect(
      await dataSource.query<
        Array<{
          id: string;
          card_name: string | null;
          card_last4: string | null;
        }>
      >(
        'SELECT id, card_name, card_last4 FROM public.transactions ORDER BY id',
      ),
    ).toEqual(cardMigrationExpected);
    expect(
      await dataSource.query<Array<{ data: unknown }>>(
        "SELECT to_jsonb(purchase) - 'card_name' - 'card_last4' - 'flagged' AS data FROM public.transactions purchase ORDER BY id",
      ),
    ).toEqual(cardMigrationBefore);
    expect(
      await dataSource.query<Array<{ data: unknown }>>(
        'SELECT to_jsonb(source) AS data FROM public.import_files source ORDER BY import_id',
      ),
    ).toEqual(cardMigrationSourcesBefore);
    expect(
      cardMigrationExpected.some(
        (row) =>
          row.card_name === 'Synthetic archived card' &&
          row.card_last4 === '0042',
      ),
    ).toBe(true);
    expect(
      cardMigrationExpected.filter(
        (row) => row.card_name === 'Synthetic active card',
      ),
    ).toHaveLength(2);
    expect(
      await dataSource.query<Array<{ removed: boolean }>>(
        "SELECT removed FROM public.transactions WHERE card_name = 'Synthetic active card' ORDER BY removed",
      ),
    ).toEqual([{ removed: false }, { removed: true }]);
    const profiles = await dataSource.query<
      Array<{ mapping_config: Record<string, unknown> }>
    >('SELECT mapping_config FROM public.import_profiles ORDER BY id');
    expect(profiles).toHaveLength(1);
    expect(profiles[0].mapping_config).toMatchObject({
      cardNameColumn: null,
      cardLast4Column: null,
      dateColumn: 0,
      amountColumn: 2,
    });
    expect(profiles[0].mapping_config).not.toHaveProperty('creditCardMappings');
    expect(profiles[0].mapping_config).not.toHaveProperty('creditCardColumn');
    const [schema] = await dataSource.query<
      Array<{ table_removed: boolean; reference_removed: boolean }>
    >(`
      SELECT to_regclass('public.credit_cards') IS NULL AS table_removed,
        NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'credit_card_id') AS reference_removed
    `);
    expect(schema).toEqual({ table_removed: true, reference_removed: true });
  });

  it('backfills institution branding for active and archived accounts without rewriting account data', async () => {
    const accounts = await dataSource.query<
      Array<Record<string, unknown> & { institution_id: string | null }>
    >(`
      SELECT account.id, account.name, account.type, account.due_date,
        account.removed, account.group_id, account.user_id, account.created_at,
        account.institution_id
      FROM public.bankaccounts account
      JOIN public.groups group_record ON group_record.id = account.group_id
      WHERE group_record.name = 'Legacy institution branding'
      ORDER BY account.id
    `);
    expect(
      accounts.map((account) =>
        Object.fromEntries(
          Object.entries(account).filter(([key]) => key !== 'institution_id'),
        ),
      ),
    ).toEqual(legacyAccountSnapshot);
    expect(accounts.map((account) => account.institution_id)).toEqual(
      legacyInstitutionAccounts.map((account) => account.institutionId),
    );
    const [column] = await dataSource.query<
      Array<{ data_type: string; is_nullable: string }>
    >(`
      SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bankaccounts'
        AND column_name = 'institution_id'
    `);
    expect(column).toEqual({ data_type: 'text', is_nullable: 'YES' });
    await expect(
      dataSource.query(
        'UPDATE public.bankaccounts SET institution_id = $1 WHERE id = $2',
        ['unlisted', accounts[0].id],
      ),
    ).rejects.toThrow();
  });

  it('persists validated institution choices and authorizes branding updates without tenant disclosure', async () => {
    const {
      groupId,
      otherGroupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      memberToken,
      ownerToken,
      outsiderToken,
    } = await reviewFixture();
    const createAccount = (input: Record<string, unknown>) =>
      request(httpServer)
        .post('/bankaccounts')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Personal checking',
          type: 'checkout',
          dueDate: null,
          groupId,
          ...input,
        });
    const inferred = responseBody<BankaccountOutput>(
      await createAccount({ name: 'Itaú principal' }).expect(201),
    );
    expect(inferred.institutionId).toBe('itau');
    const other = responseBody<BankaccountOutput>(
      await createAccount({
        name: 'Inter account',
        institutionId: null,
      }).expect(201),
    );
    expect(other.institutionId).toBeNull();
    const card = responseBody<BankaccountOutput>(
      await createAccount({
        name: 'Personal card',
        type: 'credit',
        dueDate: 31,
        institutionId: 'nubank',
      }).expect(201),
    );
    expect(card).toMatchObject({ institutionId: 'nubank', dueDate: 31 });
    await createAccount({ institutionId: 'unknown' }).expect(400);
    await createAccount({
      groupId: otherGroupId,
      institutionId: 'inter',
    }).expect(404);

    const patchAccount = (
      id: string,
      input: Record<string, unknown>,
      token = memberToken,
    ) =>
      request(httpServer)
        .patch(`/bankaccounts/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(input);
    await request(httpServer)
      .patch(`/bankaccounts/${checkingAccountId}`)
      .send({ institutionId: 'inter' })
      .expect(401);
    await request(httpServer)
      .patch(`/bankaccounts/${checkingAccountId}`)
      .set('Authorization', 'Bearer invalid')
      .send({ institutionId: 'inter' })
      .expect(401);
    for (const body of [
      {},
      { institutionId: 'unknown' },
      { institutionId: 'inter', groupId: otherGroupId },
      { institutionId: 'inter', userId: randomUUID() },
      { institutionId: 'inter', name: 'Changed' },
      { institutionId: 'inter', type: 'credit' },
      { institutionId: 'inter', dueDate: 20 },
    ]) {
      await patchAccount(checkingAccountId, body).expect(400);
    }
    await patchAccount('not-an-id', { institutionId: 'inter' }).expect(400);
    const denied = await patchAccount(otherCreditAccountId, {
      institutionId: 'inter',
    }).expect(404);
    const absent = await patchAccount('999999999', {
      institutionId: 'inter',
    }).expect(404);
    const deniedBody = responseBody<{ code: string; message: string }>(denied);
    expect(deniedBody.code).toBe('RESOURCE_NOT_FOUND');
    expect(deniedBody.message).toBe(
      responseBody<{ message: string }>(absent).message,
    );
    await patchAccount(
      checkingAccountId,
      { institutionId: 'inter' },
      outsiderToken,
    ).expect(404);

    const [before] = await dataSource.query<Array<{ data: unknown }>>(
      `SELECT to_jsonb(account) - 'institution_id' AS data
       FROM public.bankaccounts account WHERE id = $1`,
      [creditAccountId],
    );
    const updated = responseBody<BankaccountOutput>(
      await patchAccount(creditAccountId, { institutionId: 'itau' }).expect(
        200,
      ),
    );
    expect(updated).toMatchObject({ institutionId: 'itau', groupId });
    const [after] = await dataSource.query<Array<{ data: unknown }>>(
      `SELECT to_jsonb(account) - 'institution_id' AS data
       FROM public.bankaccounts account WHERE id = $1`,
      [creditAccountId],
    );
    expect(after).toEqual(before);
    await patchAccount(
      checkingAccountId,
      { institutionId: 'inter' },
      ownerToken,
    ).expect(200);
    const list = await request(httpServer)
      .get(`/bankaccounts?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<BankaccountOutput[]>(list)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: creditAccountId, institutionId: 'itau' }),
        expect.objectContaining({
          id: checkingAccountId,
          institutionId: 'inter',
        }),
        expect.objectContaining({ id: other.id, institutionId: null }),
      ]),
    );
    await request(httpServer)
      .delete(`/bankaccounts/${card.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    await patchAccount(card.id, { institutionId: 'inter' }).expect(404);
    await patchAccount(creditAccountId, { institutionId: null }).expect(200);
    const [{ institution_id: institutionId }] = await dataSource.query<
      Array<{ institution_id: string | null }>
    >('SELECT institution_id FROM public.bankaccounts WHERE id = $1', [
      creditAccountId,
    ]);
    expect(institutionId).toBeNull();
  });

  it('serializes current account branding through purchases, bills, payments, imports, and profiles without changing financial records', async () => {
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      await reviewFixture();
    for (const [id, institutionId] of [
      [creditAccountId, 'itau'],
      [checkingAccountId, 'inter'],
    ]) {
      await request(httpServer)
        .patch(`/bankaccounts/${id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ institutionId })
        .expect(200);
    }
    const purchase = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, { billMonth: '2026-07' }),
        )
        .expect(201),
    );
    expect(purchase.bankaccount?.institutionId).toBe('itau');
    const payment = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, checkingAccountId, { date: '2026-07-04' }),
        )
        .expect(201),
    );
    expect(payment.bankaccount?.institutionId).toBe('inter');
    const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
    const detail = responseBody<CreditCardBillDetail>(
      await request(httpServer)
        .get(`${billPath}?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(detail.bill.accountInstitutionId).toBe('itau');
    expect(detail.transactions[0]?.bankaccount?.institutionId).toBe('itau');
    expect(detail.candidates).toEqual([
      expect.objectContaining({
        transactionId: payment.id,
        accountInstitutionId: 'inter',
      }),
    ]);
    const reconciled = responseBody<CreditCardBillDetail>(
      await request(httpServer)
        .post(`${billPath}/reconciliation`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ groupId, paymentTransactionId: payment.id })
        .expect(200),
    );
    expect(reconciled.bill).toMatchObject({
      accountInstitutionId: 'itau',
      payment: { accountInstitutionId: 'inter' },
    });
    const scheduled = responseBody<CreditCardBillSummary[]>(
      await request(httpServer)
        .get(
          `/credit-card-bills?groupId=${groupId}&startDate=2026-08-01&endDate=2026-08-31`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(scheduled).toEqual([
      expect.objectContaining({
        accountId: creditAccountId,
        accountInstitutionId: 'itau',
        status: 'empty',
      }),
    ]);
    const fileContent = Buffer.from(
      'Date;Description;Amount\n21/09/2026;Synthetic;5',
    );
    const payload = importPayload({
      groupId,
      accountId: checkingAccountId,
      fileContent,
    });
    const imported = responseBody<ImportSummary>(
      await postImport(memberToken, payload, fileContent).expect(201),
    );
    expect(imported.accountInstitutionId).toBe('inter');
    const profiles = responseBody<ImportProfile[]>(
      await request(httpServer)
        .get(
          `/imports/profiles?groupId=${groupId}&fingerprint=${payload.sourceFingerprint}`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(profiles[0]?.accountInstitutionId).toBe('inter');
    const transactionSnapshot = await dataSource.query<
      Array<{ data: unknown }>
    >(
      'SELECT to_jsonb(record) AS data FROM public.transactions record WHERE group_id = $1 ORDER BY id',
      [groupId],
    );
    await request(httpServer)
      .patch(`/bankaccounts/${checkingAccountId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ institutionId: null })
      .expect(200);
    const refreshed = responseBody<CreditCardBillDetail>(
      await request(httpServer)
        .get(`${billPath}?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(refreshed.bill.payment?.accountInstitutionId).toBeNull();
    const importList = responseBody<ImportSummary[]>(
      await request(httpServer)
        .get(`/imports?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(importList[0]?.accountInstitutionId).toBeNull();
    const paymentResponse = responseBody<TransactionOutput>(
      await request(httpServer)
        .get(`/transactions/${payment.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(paymentResponse.bankaccount?.institutionId).toBeNull();
    expect(
      await dataSource.query<Array<{ data: unknown }>>(
        'SELECT to_jsonb(record) AS data FROM public.transactions record WHERE group_id = $1 ORDER BY id',
        [groupId],
      ),
    ).toEqual(transactionSnapshot);
  });

  it('stores card details on scoped purchases without creating card records or accepting stale identifiers', async () => {
    const {
      groupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      otherGroupId,
      memberToken,
      outsiderToken,
    } = await reviewFixture();
    const create = (
      accountId: string,
      metadata: Record<string, unknown> = {},
    ) =>
      request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, accountId, {
            billMonth: accountId === creditAccountId ? '2026-07' : null,
            ...metadata,
          }),
        );
    const purchase = responseBody<TransactionOutput>(
      await create(creditAccountId, {
        cardName: '  Personal  ',
        cardLast4: '0042',
      }).expect(201),
    );
    expect(purchase).toMatchObject({ cardName: 'Personal', cardLast4: '0042' });
    expect(purchase).not.toHaveProperty('creditCard');
    await create(checkingAccountId, { cardName: 'Personal' }).expect(400);
    await create(checkingAccountId, { cardLast4: '0042' }).expect(400);
    await create(creditAccountId, { creditCardId: '1' }).expect(400);
    await request(httpServer)
      .patch(`/transactions/${purchase.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ creditCardId: '1' })
      .expect(400);
    await request(httpServer)
      .post('/credit-cards')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ accountId: creditAccountId, name: 'Obsolete' })
      .expect(404);
    await request(httpServer)
      .patch(`/transactions/${purchase.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ cardName: 'Foreign edit' })
      .expect(404);
    await request(httpServer)
      .patch(`/transactions/${purchase.id}`)
      .send({ cardName: 'Missing identity' })
      .expect(401);
    const edited = responseBody<TransactionOutput>(
      await request(httpServer)
        .patch(`/transactions/${purchase.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ cardName: 'Personal virtual', cardLast4: null })
        .expect(200),
    );
    expect(edited).toMatchObject({
      cardName: 'Personal virtual',
      cardLast4: null,
      value: purchase.value,
      creditDueDate: purchase.creditDueDate,
    });
    await request(httpServer)
      .patch(`/transactions/${purchase.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ cardName: null, cardLast4: null })
      .expect(200);
    await request(httpServer)
      .get(`/transactions/card-values?groupId=${groupId}`)
      .expect(401);
    await request(httpServer)
      .get(`/transactions/card-values?groupId=${otherGroupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
    expect(
      responseBody<unknown[]>(
        await request(httpServer)
          .get(
            `/transactions/card-values?groupId=${groupId}&accountId=${otherCreditAccountId}`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200),
      ),
    ).toEqual([]);
  });

  it('groups three transaction card labels into one bill and filters metadata before pagination without narrowing its payment', async () => {
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      await reviewFixture();
    const inputs = [
      { cardName: 'Personal', cardLast4: '0042', value: -40 },
      { cardName: 'Family', cardLast4: '1234', value: -70 },
      { cardName: 'Virtual', cardLast4: '1234', value: -5 },
      { cardName: 'Personal', cardLast4: '0042', value: 10 },
      { cardName: null, cardLast4: null, value: -20 },
    ];
    for (const row of inputs)
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            billMonth: '2026-07',
            ...row,
          }),
        )
        .expect(201);
    const cardKey = cardMetadataKey({
      cardName: 'Personal',
      cardLast4: '0042',
    });
    const query = new URLSearchParams({
      groupId,
      cardList: cardKey,
      pageSize: '1',
    });
    const filtered = responseBody<{
      data: TransactionOutput[];
      totalCount: number;
    }>(
      await request(httpServer)
        .get(`/transactions?${query}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(filtered.totalCount).toBe(2);
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0]).toMatchObject({
      cardName: 'Personal',
      cardLast4: '0042',
    });
    const values = responseBody<CardMetadata[]>(
      await request(httpServer)
        .get(`/transactions/card-values?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(values).toHaveLength(4);
    expect(values).toEqual(
      expect.arrayContaining(
        inputs
          .slice(0, 3)
          .map(({ cardName, cardLast4 }) => ({ cardName, cardLast4 })),
      ),
    );
    const path = `/credit-card-bills/${creditAccountId}/2026-07`;
    const detail = responseBody<CreditCardBillDetail>(
      await request(httpServer)
        .get(`${path}?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(detail.bill).toMatchObject({
      transactionCount: 5,
      total: -125,
      reviewMonth: '2026-06',
    });
    expect(detail.cardSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardName: 'Personal',
          cardLast4: '0042',
          transactionCount: 2,
          total: -30,
        }),
        expect.objectContaining({
          cardName: 'Family',
          cardLast4: '1234',
          transactionCount: 1,
          total: -70,
        }),
        expect.objectContaining({
          cardName: 'Virtual',
          cardLast4: '1234',
          transactionCount: 1,
          total: -5,
        }),
        expect.objectContaining({
          cardName: null,
          cardLast4: null,
          transactionCount: 1,
          total: -20,
        }),
      ]),
    );
    const grouped = responseBody<CreditCardBillSummary[]>(
      await request(httpServer)
        .get(
          `/credit-card-bills?${new URLSearchParams({ groupId, cardList: cardKey })}`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(grouped.find((bill) => bill.billMonth === '2026-07')).toMatchObject({
      total: -125,
      transactionCount: 5,
      matchingTotal: -30,
      matchingTransactionCount: 2,
    });
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, checkingAccountId, {
          date: '2026-07-04',
          value: -125,
        }),
      )
      .expect(201)
      .then(async (response) => {
        const payment = responseBody<TransactionOutput>(response);
        const result = responseBody<CreditCardBillDetail>(
          await request(httpServer)
            .post(`${path}/reconciliation`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ groupId, paymentTransactionId: payment.id })
            .expect(200),
        );
        expect(result.bill).toMatchObject({
          total: -125,
          status: 'reconciled',
          payment: { transactionId: payment.id },
        });
      });
    const unidentified = responseBody<{ data: TransactionOutput[] }>(
      await request(httpServer)
        .get(`/transactions?groupId=${groupId}&cardList=-1`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(unidentified.data).toHaveLength(1);
    expect(unidentified.data[0].bankaccount?.type).toBe('credit');
  });

  it('rejects unsafe card metadata at the API boundary without rewriting the purchase', async () => {
    const { groupId, creditAccountId, memberToken } = await reviewFixture();
    const purchase = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            billMonth: '2026-07',
            cardName: 'Safe',
            cardLast4: '0012',
          }),
        )
        .expect(201),
    );
    const unsafeNames = [
      'invalid\nlabel',
      '1'.repeat(16),
      '\uFF11'.repeat(16),
      '\u2460'.repeat(16),
      ...['/', '|', ':', '_', 'letters'].map((separator) =>
        Array(4).fill('1111').join(separator),
      ),
    ];
    for (const cardName of unsafeNames)
      await request(httpServer)
        .patch(`/transactions/${purchase.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ cardName })
        .expect(400);
    for (const cardLast4 of ['123', '12345', 'ABCD', '1'.repeat(16), 1234])
      await request(httpServer)
        .patch(`/transactions/${purchase.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ cardLast4 })
        .expect(400);
    const after = responseBody<TransactionOutput>(
      await request(httpServer)
        .get(`/transactions/${purchase.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(after).toEqual(purchase);
  });

  it.each([
    {
      label: 'positive half cent',
      values: [1.005],
      expectedTotal: 1.01,
      expectedBuckets: [1.01],
      adjustment: 0,
    },
    {
      label: 'negative half cent',
      values: [-1.005],
      expectedTotal: -1.01,
      expectedBuckets: [-1.01],
      adjustment: 0,
    },
    {
      label: 'positive multi-card subcents',
      values: [0.005, 0.005, 0.005],
      expectedTotal: 0.02,
      expectedBuckets: [0.01, 0.01, 0.01],
      adjustment: -0.01,
    },
    {
      label: 'negative multi-card subcents',
      values: [-0.005, -0.005, -0.005],
      expectedTotal: -0.02,
      expectedBuckets: [-0.01, -0.01, -0.01],
      adjustment: 0.01,
    },
    {
      label: 'offsetting positive and negative half cents',
      values: [1.005, -1.005],
      expectedTotal: 0,
      expectedBuckets: [1.01, -1.01],
      adjustment: 0,
    },
  ])(
    'reports explicit PostgreSQL card rounding for $label without changing bill/payment/month identity',
    async ({ values, expectedTotal, expectedBuckets, adjustment }) => {
      const { groupId, creditAccountId, checkingAccountId, memberToken } =
        await reviewFixture();
      for (const [index, value] of values.entries()) {
        await request(httpServer)
          .post('/transactions')
          .set('Authorization', `Bearer ${memberToken}`)
          .send(
            reviewTransaction(groupId, creditAccountId, {
              billMonth: '2026-07',
              cardName: `Card ${index + 1}`,
              value,
            }),
          )
          .expect(201);
      }
      const before = await dataSource.query<Array<{ data: unknown }>>(
        'SELECT to_jsonb(record) AS data FROM public.transactions record WHERE group_id = $1 ORDER BY id',
        [groupId],
      );
      const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
      const detail = responseBody<CreditCardBillDetail>(
        await request(httpServer)
          .get(`${billPath}?groupId=${groupId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect((response) =>
            diagnoseUnexpectedFixtureUnauthorized(response, memberToken),
          )
          .expect(200),
      );
      expect(detail.bill).toMatchObject({
        accountId: creditAccountId,
        billMonth: '2026-07',
        reviewMonth: '2026-06',
        total: expectedTotal,
      });
      expect(detail.cardSummaries.map((card) => card.total)).toEqual(
        expectedBuckets,
      );
      expect(detail.cardRoundingAdjustment).toBe(adjustment);
      expect(
        Math.round(
          (detail.cardSummaries.reduce((sum, card) => sum + card.total, 0) +
            detail.cardRoundingAdjustment) *
            100,
        ),
      ).toBe(Math.round(detail.bill.total * 100));
      expect(
        await dataSource.query<Array<{ data: unknown }>>(
          'SELECT to_jsonb(record) AS data FROM public.transactions record WHERE group_id = $1 ORDER BY id',
          [groupId],
        ),
      ).toEqual(before);
      const payment = responseBody<TransactionOutput>(
        await request(httpServer)
          .post('/transactions')
          .set('Authorization', `Bearer ${memberToken}`)
          .send(
            reviewTransaction(groupId, checkingAccountId, {
              date: '2026-07-04',
              value: -Math.abs(expectedTotal),
            }),
          )
          .expect(201),
      );
      const reconciled = responseBody<CreditCardBillDetail>(
        await request(httpServer)
          .post(`${billPath}/reconciliation`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ groupId, paymentTransactionId: payment.id })
          .expect(200),
      );
      expect(reconciled.bill).toMatchObject({
        accountId: creditAccountId,
        billMonth: '2026-07',
        reviewMonth: '2026-06',
        total: expectedTotal,
        payment: { transactionId: payment.id },
      });
      expect(reconciled.cardRoundingAdjustment).toBe(adjustment);
      const [{ count }] = await dataSource.query<Array<{ count: number }>>(
        'SELECT count(*)::integer AS count FROM public.credit_card_bill_reconciliations WHERE group_id = $1',
        [groupId],
      );
      expect(count).toBe(1);
    },
  );

  it('reads one coherent bill snapshot during concurrent purchase edits instead of reporting a non-rounding adjustment', async () => {
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      await reviewFixture();
    const purchase = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            billMonth: '2026-07',
            cardName: 'Mine',
            value: -10,
          }),
        )
        .expect(201),
    );
    const payment = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, checkingAccountId, {
            date: '2026-07-04',
            value: -10,
          }),
        )
        .expect(201),
    );
    const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
    await request(httpServer)
      .post(`${billPath}/reconciliation`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, paymentTransactionId: payment.id })
      .expect(200);
    const transactionsService =
      app.get<TransactionsService>(TransactionsService);
    const original = transactionsService.findAll.bind(
      transactionsService,
    ) as TransactionsService['findAll'];
    let releaseRead: () => void = () => {};
    let reachSnapshot: () => void = () => {};
    const resume = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    const snapshotReached = new Promise<void>((resolve) => {
      reachSnapshot = resolve;
    });
    let paused = false;
    const spy = jest
      .spyOn(transactionsService, 'findAll')
      .mockImplementation(async (...args) => {
        if (
          !paused &&
          args[2] === '2026-07' &&
          args[3] &&
          args[1].accountIdList?.includes(creditAccountId)
        ) {
          paused = true;
          reachSnapshot();
          await resume;
        }
        return original(...args);
      });
    const pendingRead = request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200)
      .then((response) => response);
    try {
      await Promise.race([
        snapshotReached,
        pendingRead.then(() => {
          throw new Error(
            'The bill detail did not enter its purchase snapshot',
          );
        }),
      ]);
      await request(httpServer)
        .patch(`/transactions/${purchase.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ value: -25 })
        .expect(200);
      releaseRead();
      const snapshot = responseBody<CreditCardBillDetail>(await pendingRead);
      expect(snapshot.bill).toMatchObject({
        total: -10,
        reviewMonth: '2026-06',
        status: 'reconciled',
        payment: { transactionId: payment.id },
      });
      expect(snapshot.transactions[0].value).toBe(-10);
      expect(snapshot.cardSummaries[0].total).toBe(-10);
      expect(snapshot.cardRoundingAdjustment).toBe(0);
    } finally {
      releaseRead();
      spy.mockRestore();
    }
    const next = responseBody<CreditCardBillDetail>(
      await request(httpServer)
        .get(`${billPath}?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(next.bill).toMatchObject({
      total: -25,
      reviewMonth: '2026-06',
      status: 'needs-review',
      payment: { transactionId: payment.id },
    });
    expect(next.cardSummaries[0].total).toBe(-25);
    expect(next.cardRoundingAdjustment).toBe(0);
  });

  it('enforces card metadata shape and credit-account scoping in PostgreSQL and preserves ordinary archival history', async () => {
    const {
      groupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      memberToken,
    } = await reviewFixture();
    const insert = (
      accountId: string,
      name: string | null,
      digits: string | null,
    ) =>
      dataSource.query(
        'INSERT INTO public.transactions (group_id, bankaccount_id, card_name, card_last4) VALUES ($1, $2, $3, $4)',
        [groupId, accountId, name, digits],
      );
    await expect(insert(checkingAccountId, 'Personal', null)).rejects.toThrow();
    await expect(
      insert(otherCreditAccountId, 'Personal', null),
    ).rejects.toThrow();
    await expect(
      insert(creditAccountId, 'Personal', '12345'),
    ).rejects.toThrow();
    await expect(
      insert(creditAccountId, '1'.repeat(16), null),
    ).rejects.toThrow();
    const purchase = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            billMonth: '2026-07',
            cardName: 'Personal',
            cardLast4: '0042',
          }),
        )
        .expect(201),
    );
    await request(httpServer)
      .delete(`/bankaccounts/${creditAccountId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<TransactionOutput>(
        await request(httpServer)
          .get(`/transactions/${purchase.id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200),
      ),
    ).toMatchObject({
      cardName: 'Personal',
      cardLast4: '0042',
      value: purchase.value,
    });
    await dataSource.query('DELETE FROM public.bankaccounts WHERE id = $1', [
      creditAccountId,
    ]);
    const rows = await dataSource.query<
      Array<{
        bankaccount_id: string | null;
        card_name: string | null;
        card_last4: string | null;
      }>
    >(
      'SELECT bankaccount_id, card_name, card_last4 FROM public.transactions WHERE id = $1',
      [purchase.id],
    );
    expect(rows).toEqual([
      { bankaccount_id: null, card_name: null, card_last4: null },
    ]);
  });

  it('imports mixed card columns directly, verifies source values, and saves reusable mappings without card identities', async () => {
    const {
      groupId,
      creditAccountId,
      otherGroupId,
      memberToken,
      outsiderToken,
    } = await reviewFixture();
    const content = Buffer.from(
      'Date;Description;Amount;Card name;Last4\n20/06/2026;Synthetic first;-10;Personal;0042\n21/06/2026;Synthetic second;-20;Family;**** 1234\n22/06/2026;Synthetic third;-30;Virtual;5678\n23/06/2026;Synthetic unknown;-5;;\n',
    );
    const payload = {
      ...importPayload({
        groupId,
        accountId: creditAccountId,
        billMonth: '2026-07',
        fileContent: content,
      }),
      rows: [
        {
          sourceRow: 2,
          date: '2026-06-20',
          amount: -10,
          description: 'Synthetic first',
          installmentCurrent: null,
          installmentTotal: null,
          cardName: 'Forged',
          cardLast4: '9999',
        },
        {
          sourceRow: 3,
          date: '2026-06-21',
          amount: -20,
          description: 'Synthetic second',
          installmentCurrent: null,
          installmentTotal: null,
          cardName: null,
          cardLast4: null,
        },
        {
          sourceRow: 4,
          date: '2026-06-22',
          amount: -30,
          description: 'Synthetic third',
          installmentCurrent: null,
          installmentTotal: null,
        },
        {
          sourceRow: 5,
          date: '2026-06-23',
          amount: -5,
          description: 'Synthetic unknown',
          installmentCurrent: null,
          installmentTotal: null,
        },
      ],
    };
    const mapped = {
      ...payload,
      config: { ...payload.config, cardNameColumn: 3, cardLast4Column: 4 },
    };
    const confirm = (
      body: Record<string, unknown>,
      bytes = content,
      token = memberToken,
    ) =>
      request(httpServer)
        .post('/imports')
        .set('Authorization', `Bearer ${token}`)
        .field('payload', JSON.stringify(body))
        .attach('file', bytes, 'synthetic.csv');
    await confirm(mapped, content, outsiderToken).expect(404);
    const preview = responseBody<PreviewImportOutput>(
      await request(httpServer)
        .post('/imports/preview')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(mapped)
        .expect(200),
    );
    expect(preview.valid).toBe(true);
    const imported = responseBody<ImportSummary>(
      await confirm(mapped).expect(201),
    );
    expect(imported.transactionCount).toBe(4);
    const transactions = responseBody<{ data: TransactionOutput[] }>(
      await request(httpServer)
        .get(`/transactions?groupId=${groupId}&importIdList=${imported.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(transactions.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardName: 'Personal', cardLast4: '0042' }),
        expect.objectContaining({ cardName: 'Family', cardLast4: '1234' }),
        expect.objectContaining({ cardName: 'Virtual', cardLast4: '5678' }),
        expect.objectContaining({ cardName: null, cardLast4: null }),
      ]),
    );
    const profiles = responseBody<ImportProfile[]>(
      await request(httpServer)
        .get(
          `/imports/profiles?groupId=${groupId}&fingerprint=${mapped.sourceFingerprint}`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(profiles[0].config).toMatchObject({
      cardNameColumn: 3,
      cardLast4Column: 4,
    });
    expect(profiles[0].config).not.toHaveProperty('creditCardMappings');
    const invalidContent = Buffer.from(
      'Date;Description;Amount;Card name;Last4\n20/06/2026;Synthetic invalid;-10;Personal;' +
        '1'.repeat(16),
    );
    const invalid = {
      ...importPayload({
        groupId,
        accountId: creditAccountId,
        billMonth: '2026-07',
        fileContent: invalidContent,
      }),
      config: mapped.config,
      rows: [mapped.rows[0]],
    };
    await confirm(invalid, invalidContent).expect(400);
    await confirm({ ...mapped, groupId: otherGroupId }).expect(404);
    await confirm({ ...mapped, creditCardId: '123' }).expect(400);
    const [{ count }] = await dataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::integer AS count FROM public.imports WHERE group_id = $1',
      [groupId],
    );
    expect(count).toBe(1);
    await request(httpServer)
      .delete(`/imports/${imported.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const retained = await dataSource.query<
      Array<{
        card_name: string | null;
        card_last4: string | null;
        removed: boolean;
      }>
    >(
      'SELECT card_name, card_last4, removed FROM public.transactions WHERE import_id = $1 ORDER BY source_row',
      [imported.id],
    );
    expect(retained[0]).toEqual({
      card_name: 'Personal',
      card_last4: '0042',
      removed: true,
    });
    const [{ same }] = await dataSource.query<Array<{ same: boolean }>>(
      'SELECT content = $2::bytea AS same FROM public.import_files WHERE import_id = $1',
      [imported.id, content],
    );
    expect(same).toBe(true);
  });

  it('backfills legacy transaction ownership from its account group', async () => {
    const [{ id: userId }] = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM public.users ORDER BY id LIMIT 1',
    );
    const [{ id: incorrectGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.groups (name)
       VALUES ('Legacy incorrect transaction group') RETURNING id`,
    );
    const [{ id: accountGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.groups (name)
       VALUES ('Legacy account group') RETURNING id`,
    );
    const [{ id: accountId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Legacy account', 'checking', $1, $2) RETURNING id`,
      [accountGroupId, userId],
    );
    const [{ id: transactionId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.transactions (
         description, bankaccount_id, group_id
       ) VALUES ('Legacy mismatched transaction', $1, $2) RETURNING id`,
      [accountId, incorrectGroupId],
    );

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await new BackfillTransactionGroups1790559700000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    const [transaction] = await dataSource.query<Array<{ group_id: string }>>(
      'SELECT group_id FROM public.transactions WHERE id = $1',
      [transactionId],
    );
    expect(transaction?.group_id).toBe(accountGroupId);

    await dataSource.query('DELETE FROM public.groups WHERE id IN ($1, $2)', [
      incorrectGroupId,
      accountGroupId,
    ]);
  });

  it('removes obsolete review metadata without changing any financial or retained-source record', async () => {
    expect(reviewMigrationAfter).toEqual(reviewMigrationBefore);
    expect(reviewMigrationBefore.transactions.length).toBeGreaterThan(0);
    expect(reviewMigrationBefore.imports.length).toBe(1);
    expect(reviewMigrationBefore.import_files.length).toBe(1);
    expect(reviewMigrationBefore.credit_card_bill_reconciliations.length).toBe(
      1,
    );
    const [{ old_table: oldTable }] = await dataSource.query<
      Array<{ old_table: string | null }>
    >(
      "SELECT to_regclass('public.credit_card_bill_reviews')::text AS old_table",
    );
    expect(oldTable).toBeNull();
    const obsoleteColumns = await dataSource.query<
      Array<{ column_name: string }>
    >(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'groups' AND column_name = 'credit_card_review_month_offset') OR (table_name = 'transactions' AND column_name = 'review_month'))",
    );
    expect(obsoleteColumns).toEqual([]);
    const obsoleteIndexes = await dataSource.query<
      Array<{ indexname: string }>
    >(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('credit_card_bill_reviews_group_month_idx', 'transactions_group_review_month_idx')",
    );
    expect(obsoleteIndexes).toEqual([]);
    const [{ date_is_utc: dateIsUtc }] = await dataSource.query<
      Array<{ date_is_utc: boolean }>
    >('SELECT date_is_utc FROM public.transactions ORDER BY id LIMIT 1');
    expect(dateIsUtc).toBe(false);
  });

  it('preserves group-owned transactions when an account is hard-deleted', async () => {
    const authUserId = '878b83da-407e-4eed-a58b-2b18dad21b22';
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, 'account-history@example.com', '{}'::jsonb)`,
      [authUserId],
    );
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name)
       VALUES ('Account history group') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO public.user_group (group_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [groupId, authUserId],
    );
    const [{ id: accountId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Historical account', 'checking', $1, $2) RETURNING id`,
      [groupId, authUserId],
    );
    const [{ id: importId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.imports (
         "fileName", group_id, account_id, file_hash, file_size,
         source_fingerprint, config_version, mapping_config,
         transaction_count, excluded_row_count, inflow_total, outflow_total
       ) VALUES (
         'history.csv', $1, $2, repeat('c', 64), 10,
         repeat('d', 64), 1, '{}'::jsonb, 1, 0, 0, 0
       ) RETURNING id`,
      [groupId, accountId],
    );
    const [{ id: transactionId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.transactions (
         description, bankaccount_id, import_id, group_id
       ) VALUES ('Historical entry', $1, $2, $3) RETURNING id`,
      [accountId, importId, groupId],
    );

    await dataSource.query('DELETE FROM public.bankaccounts WHERE id = $1', [
      accountId,
    ]);

    const rows = await dataSource.query<
      Array<{
        id: string;
        group_id: string;
        bankaccount_id: string | null;
        import_id: string | null;
      }>
    >(
      `SELECT id, group_id, bankaccount_id, import_id
       FROM public.transactions WHERE id = $1`,
      [transactionId],
    );
    expect(rows).toEqual([
      {
        id: transactionId,
        group_id: groupId,
        bankaccount_id: null,
        import_id: null,
      },
    ]);
  });

  it('defaults and constrains category appearance in PostgreSQL', async () => {
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name)
       VALUES ('Category appearance group')
       RETURNING id`,
    );
    const [category] = await dataSource.query<
      Array<{ icon: string; color: string }>
    >(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('Default appearance', $1)
       RETURNING icon, color`,
      [groupId],
    );

    expect(category).toEqual({ icon: 'tag', color: 'yellow' });
    await expect(
      dataSource.query(
        `INSERT INTO public.categories (name, icon, color, group_id)
         VALUES ('Expanded appearance', 'sparkles', 'teal', $1)`,
        [groupId],
      ),
    ).resolves.toBeDefined();
    await expect(
      dataSource.query(
        `INSERT INTO public.categories (name, icon, color, group_id)
         VALUES ('Invalid appearance', 'unknown', 'chartreuse', $1)`,
        [groupId],
      ),
    ).rejects.toThrow();
  });

  it('removes every legacy RLS and Data API authorization object', async () => {
    const boundary = await dataSource.query<
      Array<{
        protected_tables: number;
        policies: number;
        legacy_view: string | null;
        legacy_trigger_function: string | null;
        group_function: string | null;
        private_trigger_function: string | null;
      }>
    >(`
      SELECT
        (
          SELECT count(*)::integer
          FROM pg_class table_definition
          JOIN pg_namespace schema_definition
            ON schema_definition.oid = table_definition.relnamespace
          WHERE schema_definition.nspname = 'public'
            AND table_definition.relkind = 'r'
            AND table_definition.relname <> 'migrations'
            AND table_definition.relrowsecurity
        ) AS protected_tables,
        (
          SELECT count(*)::integer FROM pg_policies
          WHERE schemaname = 'public'
        ) AS policies,
        to_regclass('public.users_per_group')::text AS legacy_view,
        to_regprocedure('public.handle_new_user()')::text
          AS legacy_trigger_function,
        to_regprocedure('public.is_my_group(bigint)')::text AS group_function,
        to_regprocedure('private.handle_new_user()')::text
          AS private_trigger_function
    `);
    expect(boundary[0]).toEqual({
      protected_tables: 0,
      policies: 0,
      legacy_view: null,
      legacy_trigger_function: null,
      group_function: null,
      private_trigger_function: 'private.handle_new_user()',
    });

    const exposedPrivileges = await dataSource.query<Array<{ count: number }>>(`
      SELECT count(*)::integer AS count
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    `);
    expect(exposedPrivileges[0]?.count).toBe(0);

    const schemaPrivileges = await dataSource.query<
      Array<{ anon: boolean; authenticated: boolean; service_role: boolean }>
    >(`
      SELECT
        has_schema_privilege('anon', 'public', 'USAGE') AS anon,
        has_schema_privilege(
          'authenticated', 'public', 'USAGE'
        ) AS authenticated,
        has_schema_privilege(
          'service_role', 'public', 'USAGE'
        ) AS service_role
    `);
    expect(schemaPrivileges[0]).toEqual({
      anon: false,
      authenticated: false,
      service_role: false,
    });

    const functionPrivileges = await dataSource.query<
      Array<{ anon: boolean; authenticated: boolean; service_role: boolean }>
    >(`
      SELECT
        has_function_privilege(
          'anon', 'private.handle_new_user()', 'EXECUTE'
        ) AS anon,
        has_function_privilege(
          'authenticated', 'private.handle_new_user()', 'EXECUTE'
        ) AS authenticated,
        has_function_privilege(
          'service_role', 'private.handle_new_user()', 'EXECUTE'
        ) AS service_role
    `);
    expect(functionPrivileges[0]).toEqual({
      anon: false,
      authenticated: false,
      service_role: false,
    });
  });

  it('backfills an initial group for a profile without a membership', async () => {
    const rows = await dataSource.query<
      Array<{ group_name: string; role: string }>
    >(
      `SELECT group_record.name AS group_name, membership.role
       FROM public.user_group membership
       JOIN public.groups group_record ON group_record.id = membership.group_id
       WHERE membership.user_id = $1`,
      ['2fb65753-73c6-4e64-a4e6-f7fc22ee7746'],
    );

    expect(rows).toEqual([{ group_name: 'My finances', role: 'owner' }]);
  });

  it('provisions a profile and owner group from the auth trigger', async () => {
    const authUserId = '1f700d14-9314-47a9-bafe-e53a2b530381';
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, $2, $3)`,
      [authUserId, 'trigger-test@example.com', { name: 'Trigger Test' }],
    );

    const profiles = await dataSource.query<
      Array<{ id: string; email: string; name: string }>
    >('SELECT id, email, name FROM public.users WHERE id = $1', [authUserId]);
    expect(profiles).toEqual([
      {
        id: authUserId,
        email: 'trigger-test@example.com',
        name: 'Trigger Test',
      },
    ]);

    const memberships = await dataSource.query<
      Array<{ group_name: string; role: string }>
    >(
      `SELECT group_record.name AS group_name, membership.role
       FROM public.user_group membership
       JOIN public.groups group_record ON group_record.id = membership.group_id
       WHERE membership.user_id = $1`,
      [authUserId],
    );
    expect(memberships).toEqual([{ group_name: 'My finances', role: 'owner' }]);
  });

  it('atomically cascades group deletion through the tenant aggregate', async () => {
    const authUserId = '4316b8e1-80fb-4971-99ec-eb14a0878ad9';
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, 'owner@example.com', '{}'::jsonb)`,
      [authUserId],
    );
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name) VALUES ('Delete Me') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO public.user_group (group_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [groupId, authUserId],
    );
    const [{ id: accountId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Checking', 'checking', $1, $2) RETURNING id`,
      [groupId, authUserId],
    );
    const [{ id: creditAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (
         name, type, due_date, group_id, user_id
       ) VALUES ('Credit card', 'credit', 5, $1, $2)
       RETURNING id`,
      [groupId, authUserId],
    );
    const [{ id: categoryId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('Food', $1) RETURNING id`,
      [groupId],
    );
    const [{ id: importId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.imports (
         "fileName", group_id, account_id, file_hash, file_size,
         source_fingerprint, config_version, mapping_config,
         transaction_count, excluded_row_count, inflow_total, outflow_total
       ) VALUES (
         'test.csv', $1, $2, repeat('a', 64), 10,
         repeat('b', 64), 1, '{}'::jsonb, 1, 0, 0, 0
       ) RETURNING id`,
      [groupId, accountId],
    );
    await dataSource.query(
      `INSERT INTO public.import_files (import_id, content)
       VALUES ($1, $2)`,
      [importId, Buffer.from('group deletion statement')],
    );
    await dataSource.query(
      `INSERT INTO public.import_profiles (
         group_id, account_id, source_fingerprint,
         config_version, mapping_config
       ) VALUES ($1, $2, repeat('b', 64), 1, '{}'::jsonb)`,
      [groupId, accountId],
    );
    await dataSource.query(
      `INSERT INTO public.invites (group_id, email, pending)
       VALUES ($1, 'invitee@example.com', true)`,
      [groupId],
    );
    const [{ id: paymentTransactionId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.transactions (
         description, value, date, calculated_date,
         bankaccount_id, import_id, category_id, group_id
       ) VALUES ('Card payment', -5, '2026-01-05', '2026-01-05',
         $1, $2, $3, $4) RETURNING id`,
      [accountId, importId, categoryId, groupId],
    );
    await dataSource.query(
      `INSERT INTO public.transactions (
         description, value, date, credit_due_date,
         to_be_considered_at, calculated_date, bankaccount_id, group_id
       ) VALUES ('Credit purchase', -5, '2025-12-20', '2026-01-05',
         '2026-01-05', '2025-12-20', $1, $2)`,
      [creditAccountId, groupId],
    );
    await dataSource.query(
      `INSERT INTO public.credit_card_bill_reconciliations (
         group_id, credit_account_id, bill_month,
         payment_transaction_id, reconciled_bill_total
       ) VALUES ($1, $2, '2026-01-01', $3, -5)`,
      [groupId, creditAccountId, paymentTransactionId],
    );
    await dataSource.query('DELETE FROM public.groups WHERE id = $1', [
      groupId,
    ]);

    const aggregateRows = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count
       FROM (
         SELECT group_id FROM public.bankaccounts
         UNION ALL SELECT group_id FROM public.categories
         UNION ALL SELECT group_id FROM public.credit_card_bill_reconciliations
         UNION ALL SELECT group_id FROM public.imports
         UNION ALL SELECT group_id FROM public.import_profiles
         UNION ALL SELECT group_id FROM public.invites
         UNION ALL SELECT group_id FROM public.transactions
         UNION ALL SELECT group_id FROM public.user_group
       ) aggregate WHERE group_id = $1`,
      [groupId],
    );
    expect(aggregateRows[0]?.count).toBe(0);

    const importFileRows = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count
       FROM public.import_files WHERE import_id = $1`,
      [importId],
    );
    expect(importFileRows[0]?.count).toBe(0);

    const profileRows = await dataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::integer AS count FROM public.users WHERE id = $1',
      [authUserId],
    );
    expect(profileRows[0]?.count).toBe(1);
  });

  it('enforces membership and owner capabilities through the HTTP API', async () => {
    const ownerId = '970cdd15-5ab4-4a36-bf26-c20aac814202';
    const memberId = 'ba247f46-8b33-4522-85d8-f9750bbd02d4';
    const outsiderId = '943d4f22-ebaa-4d40-8f62-f32204a0b3e9';
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
       ($1, 'owner-api@example.com', '{}'::jsonb),
       ($2, 'member-api@example.com', '{}'::jsonb),
       ($3, 'outsider-api@example.com', '{}'::jsonb)`,
      [ownerId, memberId, outsiderId],
    );
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name) VALUES ('API Group') RETURNING id`,
    );
    const [{ id: otherGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(`INSERT INTO public.groups (name) VALUES ('Other Group') RETURNING id`);
    await dataSource.query(
      `INSERT INTO public.user_group (group_id, user_id, role) VALUES
       ($1, $2, 'owner'),
       ($1, $3, 'member'),
       ($4, $5, 'owner')`,
      [groupId, ownerId, memberId, otherGroupId, outsiderId],
    );
    const [{ id: accountId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('API Checking', 'checking', $1, $2) RETURNING id`,
      [groupId, ownerId],
    );
    const [{ id: categoryId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('API Category', $1) RETURNING id`,
      [groupId],
    );
    const [{ id: transactionId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.transactions (
         description, value, bankaccount_id, category_id, group_id
       ) VALUES ('Visible only to members', 10, $1, $2, $3) RETURNING id`,
      [accountId, categoryId, groupId],
    );

    const ownerToken = tokenFor(ownerId, 'owner-api@example.com');
    const memberToken = tokenFor(memberId, 'member-api@example.com');
    const outsiderToken = tokenFor(outsiderId, 'outsider-api@example.com');

    const categoryAppearanceResponse = await request(httpServer)
      .post('/categories')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Custom category',
        icon: 'coffee',
        color: 'rose',
        groupId,
      })
      .expect(201);
    const customCategory = responseBody<{
      id: string;
      name: string;
      icon: string;
      color: string;
      groupId: string;
    }>(categoryAppearanceResponse);
    expect(customCategory).toEqual(
      expect.objectContaining({
        name: 'Custom category',
        icon: 'coffee',
        color: 'rose',
        groupId,
      }),
    );
    await request(httpServer)
      .post('/categories')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Invalid', icon: 'unknown', color: 'chartreuse', groupId })
      .expect(400);

    const updatedCategoryResponse = await request(httpServer)
      .patch(`/categories/${categoryId}/appearance`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ icon: 'plane', color: 'sky' })
      .expect(200);
    expect(
      responseBody<{ icon: string; color: string }>(updatedCategoryResponse),
    ).toEqual(expect.objectContaining({ icon: 'plane', color: 'sky' }));
    await request(httpServer)
      .patch(`/categories/${categoryId}/appearance`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ icon: 'plane', color: 'chartreuse' })
      .expect(400);
    await request(httpServer)
      .patch(`/categories/${categoryId}/appearance`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ icon: 'plane', color: 'sky' })
      .expect(404);

    const unauthorized = await request(httpServer).get('/groups').expect(401);
    const unauthorizedBody = responseBody<{
      code: string;
      requestId: string;
    }>(unauthorized);
    expect(unauthorizedBody.code).toBe('AUTHENTICATION_REQUIRED');
    expect(unauthorizedBody.requestId).toEqual(expect.any(String));
    expect(unauthorized.headers['x-request-id'] as unknown).toBe(
      unauthorizedBody.requestId,
    );

    await request(httpServer)
      .patch(`/groups/${groupId}`)
      .send({ name: 'Renamed' })
      .expect(401);
    await request(httpServer)
      .patch(`/groups/${groupId}`)
      .set('Authorization', 'Bearer invalid')
      .send({ name: 'Renamed' })
      .expect(401);
    for (const body of [
      { name: '   ' },
      { name: 'x'.repeat(121) },
      {},
      { name: 'Renamed', groupId: otherGroupId },
      { name: 'Renamed', userId: ownerId },
    ]) {
      await request(httpServer)
        .patch(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(body)
        .expect(400);
    }
    await request(httpServer)
      .patch(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Member change' })
      .expect(403);
    for (const id of [groupId, '999999999']) {
      const denied = await request(httpServer)
        .patch(`/groups/${id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ name: 'Outsider change' })
        .expect(404);
      expect(responseBody<{ message: string }>(denied).message).toBe(
        'Resource not found',
      );
    }
    const renamed = await request(httpServer)
      .patch(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '  Renamed workspace  ' })
      .expect(200);
    expect(responseBody<{ name: string }>(renamed).name).toBe(
      'Renamed workspace',
    );
    const persisted = await request(httpServer)
      .get(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<{ name: string }>(persisted).name).toBe(
      'Renamed workspace',
    );
    // Restore this fixture's name for the deletion confirmation checks below.
    await request(httpServer)
      .patch(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'API Group' })
      .expect(200);

    const initialFlag = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<{ flagged: boolean }>(initialFlag).flagged).toBe(false);
    await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .send({ flagged: true })
      .expect(401);
    await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', 'Bearer invalid')
      .send({ flagged: true })
      .expect(401);
    for (const flagged of ['true', 1, null]) {
      await request(httpServer)
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ flagged })
        .expect(400);
    }
    for (const body of [
      { flagged: true, groupId: otherGroupId },
      { flagged: true, userId: ownerId },
    ]) {
      await request(httpServer)
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(body)
        .expect(400);
    }
    for (const id of [transactionId, '999999999']) {
      await request(httpServer)
        .patch(`/transactions/${id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ flagged: true })
        .expect(404);
    }
    const flagged = await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ flagged: true })
      .expect(200);
    expect(responseBody<{ flagged: boolean }>(flagged).flagged).toBe(true);
    const flagReload = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(responseBody<{ flagged: boolean }>(flagReload).flagged).toBe(true);
    const flagList = await request(httpServer)
      .get(`/transactions?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string; flagged: boolean }> }>(flagList)
        .data,
    ).toContainEqual(
      expect.objectContaining({ id: transactionId, flagged: true }),
    );
    const unflagged = await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ flagged: false })
      .expect(200);
    expect(responseBody<{ flagged: boolean }>(unflagged).flagged).toBe(false);

    const groupsResponse = await request(httpServer)
      .get('/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(
      responseBody<Array<{ id: string; isOwner: boolean }>>(groupsResponse),
    ).toEqual([
      expect.objectContaining({ isOwner: true }),
      expect.objectContaining({ id: groupId, isOwner: true }),
    ]);

    const memberGroupsResponse = await request(httpServer)
      .get('/groups')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<Array<{ id: string; isOwner: boolean }>>(
        memberGroupsResponse,
      ),
    ).toEqual([
      expect.objectContaining({ isOwner: true }),
      expect.objectContaining({ id: groupId, isOwner: false }),
    ]);

    const outsiderGroupsResponse = await request(httpServer)
      .get('/groups')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
    expect(
      responseBody<Array<{ id: string; isOwner: boolean }>>(
        outsiderGroupsResponse,
      ),
    ).toEqual([
      expect.objectContaining({ isOwner: true }),
      expect.objectContaining({ id: otherGroupId, isOwner: true }),
    ]);

    await request(httpServer)
      .get(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);

    const transactionListResponse = await request(httpServer)
      .get(`/transactions?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }>; totalCount: number }>(
        transactionListResponse,
      ),
    ).toEqual({
      data: [expect.objectContaining({ id: transactionId })],
      totalCount: 1,
    });

    const transactionResponse = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const transactionBody = responseBody<{
      id: string;
      group: { id: string };
    }>(transactionResponse);
    expect(transactionBody.id).toBe(transactionId);
    expect(transactionBody.group.id).toBe(groupId);
    expect(
      responseBody<{
        category: { id: string; name: string; icon: string; color: string };
      }>(transactionResponse).category,
    ).toEqual({
      id: categoryId,
      name: 'API Category',
      icon: 'plane',
      color: 'sky',
    });

    await request(httpServer)
      .delete(`/bankaccounts/${accountId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    await request(httpServer)
      .delete(`/categories/${categoryId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const archivedReferences = await dataSource.query<
      Array<{ account_removed: boolean; category_removed: boolean }>
    >(
      `SELECT account.removed AS account_removed,
              category.removed AS category_removed
       FROM public.bankaccounts account, public.categories category
       WHERE account.id = $1 AND category.id = $2`,
      [accountId, categoryId],
    );
    expect(archivedReferences[0]).toEqual({
      account_removed: true,
      category_removed: true,
    });

    const recategorizedTransaction = await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ categoryId: customCategory.id })
      .expect(200);
    const recategorizedBody = responseBody<{
      bankaccount: { id: string } | null;
      category: { id: string } | null;
      group: { id: string };
    }>(recategorizedTransaction);
    expect(recategorizedBody.bankaccount?.id).toBe(accountId);
    expect(recategorizedBody.category?.id).toBe(customCategory.id);
    expect(recategorizedBody.group.id).toBe(groupId);

    const [{ id: importAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Import Account', 'checking', $1, $2) RETURNING id`,
      [groupId, ownerId],
    );
    const apiImportFileContent = Buffer.from(
      'Date;Description;Amount\n2026-09-21;API import;5',
    );
    const apiImportPayload = importPayload({
      groupId,
      accountId: importAccountId,
      fileName: 'api-import.csv',
      fileContent: apiImportFileContent,
    });
    const createImportResponse = await postImport(
      memberToken,
      apiImportPayload,
      apiImportFileContent,
    ).expect(201);
    const { id: importId } = responseBody<{ id: string }>(createImportResponse);
    await request(httpServer)
      .delete(`/imports/${importId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const archivedImport = await dataSource.query<
      Array<{
        import_removed: boolean;
        transaction_removed: boolean;
      }>
    >(
      `SELECT import_record.removed AS import_removed,
              transaction.removed AS transaction_removed
       FROM public.imports import_record
       JOIN public.transactions transaction
         ON transaction.import_id = import_record.id
       WHERE import_record.id = $1`,
      [importId],
    );
    expect(archivedImport).toEqual([
      { import_removed: true, transaction_removed: true },
    ]);

    const denied = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    const absent = await request(httpServer)
      .get('/transactions/999999999')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    const deniedBody = responseBody<{ code: string; message: string }>(denied);
    const absentBody = responseBody<{ code: string; message: string }>(absent);
    expect(deniedBody.code).toBe('RESOURCE_NOT_FOUND');
    expect(deniedBody.message).toBe(absentBody.message);

    for (const path of [
      `/bankaccounts?groupId=${groupId}`,
      `/categories?groupId=${groupId}`,
      `/imports?groupId=${groupId}`,
      `/transactions?groupId=${groupId}`,
      `/user-groups?groupId=${groupId}`,
    ]) {
      await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(404);
    }

    await request(httpServer)
      .get(`/invites?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(httpServer)
      .post('/bankaccounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Bypass attempt',
        type: 'checking',
        dueDate: null,
        groupId,
        userId: outsiderId,
      })
      .expect(400);
    const accountIdentityResponse = await request(httpServer)
      .post('/bankaccounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Authenticated owner account',
        type: 'checking',
        dueDate: null,
        groupId,
      })
      .expect(201);
    expect(
      responseBody<{ userId: string }>(accountIdentityResponse).userId,
    ).toBe(ownerId);

    const creditAccountResponse = await request(httpServer)
      .post('/bankaccounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Authenticated owner card',
        type: 'credit',
        dueDate: 5,
        groupId,
      })
      .expect(201);
    expect(
      responseBody<{ dueDate: number }>(creditAccountResponse).dueDate,
    ).toBe(5);

    for (const dueDate of [0, 32, '5', '2026-09-05', null]) {
      await request(httpServer)
        .post('/bankaccounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Invalid card',
          type: 'credit',
          dueDate,
          groupId,
        })
        .expect(400);
    }

    await request(httpServer)
      .delete(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ confirmName: 'Wrong name' })
      .expect(404);
  });

  it('backfills verified source card fields while preserving categories, edits, source files, and deleted history', async () => {
    const { importId, groupId } = await cardBackfillFixture();
    const [category] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('Synthetic backfill category', $1) RETURNING id`,
      [groupId],
    );
    await dataSource.query(
      `UPDATE public.transactions SET category_id = $1,
         observation = 'Synthetic manual note', value = -42
       WHERE import_id = $2 AND group_id = $3`,
      [category.id, importId, groupId],
    );
    await dataSource.query(
      `UPDATE public.transactions SET card_name = CASE source_row
         WHEN 4 THEN 'Manual' WHEN 5 THEN 'Shared' END,
         removed = (source_row = 7)
       WHERE import_id = $1 AND group_id = $2`,
      [importId, groupId],
    );
    const deleted = await cardBackfillFixture();
    await dataSource.query(
      'UPDATE public.imports SET removed = true WHERE id = $1',
      [deleted.importId],
    );
    const checking = await cardBackfillFixture('checking');
    const foreign = await cardBackfillFixture('foreign');
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const before = await cardBackfillSnapshot(runner, true);
      const migration = new BackfillImportedCardMetadata1792501867419();
      const plan = await migration.plan(runner);
      expect(plan.conflictingRows).toBe(1);
      expect(
        plan.updates.filter((row) => row.import_id === importId),
      ).toHaveLength(3);
      expect(
        plan.updates.some(
          (row) =>
            row.import_id === deleted.importId ||
            row.import_id === checking.importId,
        ),
      ).toBe(false);
      await migration.up(runner);
      await migration.up(runner);
      expect(await cardBackfillSnapshot(runner, true)).toEqual(before);
      const cards = await runner.manager.query<
        Array<{
          source_row: number;
          card_name: string | null;
          card_last4: string | null;
        }>
      >(
        `SELECT source_row, card_name, card_last4 FROM public.transactions
         WHERE import_id = $1 AND group_id = $2 ORDER BY source_row`,
        [importId, groupId],
      );
      expect(cards).toEqual([
        { source_row: 2, card_name: 'Personal', card_last4: '0042' },
        { source_row: 4, card_name: 'Manual', card_last4: null },
        { source_row: 5, card_name: 'Shared', card_last4: '0099' },
        { source_row: 6, card_name: null, card_last4: null },
        { source_row: 7, card_name: null, card_last4: null },
        { source_row: 8, card_name: 'Name only', card_last4: null },
      ]);
      const [other] = await runner.manager.query<
        Array<{
          card_name: string | null;
          card_last4: string | null;
        }>
      >(
        `SELECT card_name, card_last4 FROM public.transactions
         WHERE import_id = $1 AND group_id = $2 AND source_row = 2`,
        [foreign.importId, foreign.groupId],
      );
      expect(other).toEqual({ card_name: 'Foreign', card_last4: '0042' });
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it.each(['file', 'hash', 'row', 'duplicate-row', 'digits', 'mapping'])(
    'rejects unverifiable card backfills (%s) without changing financial records',
    async (failure) => {
      const { importId, content } = await cardBackfillFixture();
      const runner = dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        if (failure === 'file') {
          await runner.query(
            'DELETE FROM public.import_files WHERE import_id = $1',
            [importId],
          );
        } else if (failure === 'hash') {
          await runner.query(
            "UPDATE public.imports SET file_hash = repeat('0', 64) WHERE id = $1",
            [importId],
          );
        } else if (failure === 'row' || failure === 'duplicate-row') {
          await runner.query(
            'UPDATE public.transactions SET source_row = $1 WHERE import_id = $2 AND source_row = 2',
            [failure === 'row' ? 999 : 4, importId],
          );
        } else if (failure === 'mapping') {
          await runner.query(
            "UPDATE public.imports SET mapping_config = '{}'::jsonb WHERE id = $1",
            [importId],
          );
        } else {
          const invalid = Buffer.from(
            content.toString().replace('**** 0042', '1234567890123456'),
          );
          await runner.query(
            'UPDATE public.import_files SET content = $1 WHERE import_id = $2',
            [invalid, importId],
          );
          await runner.query(
            'UPDATE public.imports SET file_hash = $1, file_size = $2 WHERE id = $3',
            [
              createHash('sha256').update(invalid).digest('hex'),
              invalid.length,
              importId,
            ],
          );
        }
        const before = await cardBackfillSnapshot(runner);
        await expect(
          new BackfillImportedCardMetadata1792501867419().up(runner),
        ).rejects.toThrow('Card backfill');
        expect(await cardBackfillSnapshot(runner)).toEqual(before);
      } finally {
        await runner.rollbackTransaction();
        await runner.release();
      }
    },
  );

  it('rolls back the entire card backfill when an update is skipped concurrently', async () => {
    await cardBackfillFixture();
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    const before = await cardBackfillSnapshot(runner);
    await runner.startTransaction();
    try {
      await runner.query(`
        CREATE FUNCTION private.skip_card_backfill_test() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.source_row = 5 THEN RETURN NULL; END IF; RETURN NEW; END; $$;
        CREATE TRIGGER skip_card_backfill_test BEFORE UPDATE OF card_name ON public.transactions
        FOR EACH ROW EXECUTE FUNCTION private.skip_card_backfill_test();
      `);
      await expect(
        new BackfillImportedCardMetadata1792501867419().up(runner),
      ).rejects.toThrow('changed concurrently');
    } finally {
      await runner.rollbackTransaction();
    }
    try {
      expect(await cardBackfillSnapshot(runner)).toEqual(before);
    } finally {
      await runner.release();
    }
  });

  it('corrects retained imported refund signs without changing edits, tenant attribution, dates, or deletion history', async () => {
    const fixture = await reviewFixture();
    const sourceAmounts = [25, -10.123, 0, -7, -3, -4];
    const legacyAmounts = [-25, -10.123, 0, -7, 3, -4];
    const content = Buffer.from(
      [
        'Date;Description;Amount',
        ...sourceAmounts.map(
          (amount) => `2026-06-18;Synthetic retained source;${amount}`,
        ),
        '2026-06-18;Synthetic excluded source;-999',
      ].join('\n'),
    );
    const payload = importPayload({
      groupId: fixture.groupId,
      accountId: fixture.checkingAccountId,
      fileContent: content,
      rows: legacyAmounts.map((amount, index) => ({
        sourceRow: index + 2,
        date: '2026-06-18',
        amount,
        description: 'Synthetic retained transaction',
        installmentCurrent: null,
        installmentTotal: null,
      })),
    });
    payload.config.numberFormat = 'decimal-point';
    payload.excludedRowCount = 1;
    const created = await postImport(
      fixture.memberToken,
      payload,
      content,
    ).expect(201);
    const importId = responseBody<{ id: string }>(created).id;
    await dataSource.query(
      `UPDATE public.imports
       SET mapping_config = jsonb_set(mapping_config, '{chargesPositive}', 'true'),
           removed = true
       WHERE id = $1 AND group_id = $2`,
      [importId, fixture.groupId],
    );
    await dataSource.query(
      `UPDATE public.transactions SET value = -8,
         observation = 'Synthetic manual amount edit'
       WHERE import_id = $1 AND group_id = $2 AND source_row = 5`,
      [importId, fixture.groupId],
    );
    await dataSource.query(
      `UPDATE public.transactions SET removed = true
       WHERE import_id = $1 AND group_id = $2 AND source_row = 7`,
      [importId, fixture.groupId],
    );
    const [category] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('Synthetic sign category', $1) RETURNING id`,
      [fixture.groupId],
    );
    await dataSource.query(
      `UPDATE public.transactions SET category_id = $1
       WHERE import_id = $2 AND group_id = $3 AND source_row = 3`,
      [category.id, importId, fixture.groupId],
    );

    const otherContent = Buffer.from(
      'Date;Description;Amount\n2026-06-18;Synthetic other-group refund;-12',
    );
    const otherPayload = importPayload({
      groupId: fixture.otherGroupId,
      accountId: fixture.otherCreditAccountId,
      fileContent: otherContent,
      fileName: 'other-group.csv',
      billMonth: '2026-07',
      rows: [{ ...payload.rows[0], sourceRow: 2, amount: -12 }],
    });
    otherPayload.config.numberFormat = 'decimal-point';
    const otherCreated = await postImport(
      fixture.outsiderToken,
      otherPayload,
      otherContent,
    ).expect(201);
    const otherImportId = responseBody<{ id: string }>(otherCreated).id;
    await dataSource.query(
      `UPDATE public.imports
       SET mapping_config = jsonb_set(mapping_config, '{chargesPositive}', 'true')
       WHERE id = $1 AND group_id = $2`,
      [otherImportId, fixture.otherGroupId],
    );

    const unchangedImportIds: string[] = [];
    for (const amountMode of ['signed', 'debit-credit']) {
      const untouchedContent = Buffer.from(
        `Date;Description;Amount;Credit\n2026-06-18;Synthetic ${amountMode} amount;-9;0`,
      );
      const untouchedPayload = importPayload({
        groupId: fixture.groupId,
        accountId: fixture.checkingAccountId,
        fileContent: untouchedContent,
        fileName: `${amountMode}.csv`,
        rows: [{ ...payload.rows[0], sourceRow: 2, amount: -9 }],
      });
      const untouched = await postImport(
        fixture.memberToken,
        untouchedPayload,
        untouchedContent,
      ).expect(201);
      const untouchedId = responseBody<{ id: string }>(untouched).id;
      unchangedImportIds.push(untouchedId);
      if (amountMode === 'debit-credit') {
        await dataSource.query(
          `UPDATE public.imports SET mapping_config = mapping_config ||
           '{"amountMode":"debit-credit","chargesPositive":true,"debitColumn":2,"creditColumn":3}'::jsonb
           WHERE id = $1 AND group_id = $2`,
          [untouchedId, fixture.groupId],
        );
      }
    }
    const manual = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${fixture.memberToken}`)
      .send(
        reviewTransaction(fixture.groupId, fixture.checkingAccountId, {
          value: -21,
        }),
      )
      .expect(201);
    const manualId = responseBody<{ id: string }>(manual).id;
    const allImportIds = [importId, otherImportId, ...unchangedImportIds];
    const attributionBefore = await dataSource.query<
      Array<{ retained: Record<string, unknown> }>
    >(
      `SELECT to_jsonb(transaction_record) - 'value' AS retained
       FROM public.transactions transaction_record
       WHERE import_id = ANY($1::bigint[]) ORDER BY id`,
      [allImportIds],
    );
    const importsBefore = await dataSource.query<
      Array<{ retained: Record<string, unknown> }>
    >(
      `SELECT to_jsonb(import_record) - 'inflow_total' - 'outflow_total' AS retained
       FROM public.imports import_record WHERE id = ANY($1::bigint[]) ORDER BY id`,
      [allImportIds],
    );
    const filesBefore = await dataSource.query<Array<{ content: Buffer }>>(
      `SELECT content FROM public.import_files
       WHERE import_id = ANY($1::bigint[]) ORDER BY import_id`,
      [allImportIds],
    );
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const migration = new CorrectImportedAmountSigns1791100000000();
      await migration.up(runner);
      await migration.up(runner);
      await runner.commitTransaction();
      await expect(migration.down()).rejects.toThrow('forward-only');
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }

    const corrected = await dataSource.query<
      Array<{ source_row: number; value: number }>
    >(
      `SELECT source_row, value FROM public.transactions
       WHERE import_id = $1 AND group_id = $2 ORDER BY source_row`,
      [importId, fixture.groupId],
    );
    expect(corrected).toEqual(
      [-25, 10.123, 0, -8, 3, 4].map((value, index) => ({
        source_row: index + 2,
        value,
      })),
    );
    const correctedSummaries = await dataSource.query<
      Array<{ id: string; inflow_total: number; outflow_total: number }>
    >(
      `SELECT id, inflow_total, outflow_total FROM public.imports
       WHERE id = ANY($1::bigint[]) ORDER BY id`,
      [[importId, otherImportId]],
    );
    expect(correctedSummaries).toEqual([
      { id: importId, inflow_total: 24.12, outflow_total: -25 },
      { id: otherImportId, inflow_total: 12, outflow_total: 0 },
    ]);
    expect(
      await dataSource.query(
        `SELECT value FROM public.transactions WHERE import_id = $1 AND group_id = $2`,
        [otherImportId, fixture.otherGroupId],
      ),
    ).toEqual([{ value: 12 }]);
    expect(
      await dataSource.query(
        `SELECT value FROM public.transactions
         WHERE import_id = ANY($1::bigint[]) ORDER BY id`,
        [unchangedImportIds],
      ),
    ).toEqual([{ value: -9 }, { value: -9 }]);
    expect(
      await dataSource.query(
        'SELECT value FROM public.transactions WHERE id = $1 AND group_id = $2',
        [manualId, fixture.groupId],
      ),
    ).toEqual([{ value: -21 }]);
    expect(
      await dataSource.query(
        `SELECT to_jsonb(transaction_record) - 'value' AS retained
         FROM public.transactions transaction_record
         WHERE import_id = ANY($1::bigint[]) ORDER BY id`,
        [allImportIds],
      ),
    ).toEqual(attributionBefore);
    expect(
      await dataSource.query(
        `SELECT to_jsonb(import_record) - 'inflow_total' - 'outflow_total' AS retained
         FROM public.imports import_record WHERE id = ANY($1::bigint[]) ORDER BY id`,
        [allImportIds],
      ),
    ).toEqual(importsBefore);
    const filesAfter = await dataSource.query<Array<{ content: Buffer }>>(
      `SELECT content FROM public.import_files
       WHERE import_id = ANY($1::bigint[]) ORDER BY import_id`,
      [allImportIds],
    );
    expect(filesAfter).toEqual(filesBefore);
  });

  it.each(['missing file', 'file hash', 'file size', 'source row', 'mapping'])(
    'rolls back the sign correction when retained import verification fails: %s',
    async (invalidSource) => {
      const fixture = await reviewFixture();
      const importIds: string[] = [];
      for (const amount of [-10, -20]) {
        const content = Buffer.from(
          `Date;Description;Amount\n2026-06-18;Synthetic rollback refund;${amount}`,
        );
        const payload = importPayload({
          groupId: fixture.groupId,
          accountId: fixture.checkingAccountId,
          fileContent: content,
          rows: [
            {
              sourceRow: 2,
              date: '2026-06-18',
              amount,
              description: 'Synthetic retained refund',
              installmentCurrent: null,
              installmentTotal: null,
            },
          ],
        });
        const created = await postImport(
          fixture.memberToken,
          payload,
          content,
        ).expect(201);
        importIds.push(responseBody<{ id: string }>(created).id);
      }
      await dataSource.query(
        `UPDATE public.imports SET mapping_config =
         jsonb_set(mapping_config, '{chargesPositive}', 'true')
         WHERE id = ANY($1::bigint[]) AND group_id = $2`,
        [importIds, fixture.groupId],
      );
      const snapshot = () =>
        dataSource.query<Array<Record<string, unknown>>>(
          `SELECT imported.id, imported.mapping_config, imported.file_hash,
             imported.file_size, imported.inflow_total, imported.outflow_total,
             transaction_record.value, transaction_record.source_row, source.content
           FROM public.imports imported
           JOIN public.transactions transaction_record
             ON transaction_record.import_id = imported.id
             AND transaction_record.group_id = imported.group_id
           JOIN public.import_files source ON source.import_id = imported.id
           WHERE imported.id = ANY($1::bigint[]) AND imported.group_id = $2
           ORDER BY imported.id`,
          [importIds, fixture.groupId],
        );
      const before = await snapshot();
      const runner = dataSource.createQueryRunner();
      await runner.connect();
      try {
        await runner.startTransaction();
        const invalidImportId = importIds[1];
        if (invalidSource === 'missing file') {
          await runner.query(
            'DELETE FROM public.import_files WHERE import_id = $1',
            [invalidImportId],
          );
        } else if (invalidSource === 'file hash') {
          await runner.query(
            `UPDATE public.imports SET file_hash = repeat('0', 64)
             WHERE id = $1 AND group_id = $2`,
            [invalidImportId, fixture.groupId],
          );
        } else if (invalidSource === 'file size') {
          await runner.query(
            `UPDATE public.imports SET file_size = file_size + 1
             WHERE id = $1 AND group_id = $2`,
            [invalidImportId, fixture.groupId],
          );
        } else if (invalidSource === 'source row') {
          await runner.query(
            `UPDATE public.transactions SET source_row = 99
             WHERE import_id = $1 AND group_id = $2`,
            [invalidImportId, fixture.groupId],
          );
        } else {
          await runner.query(
            `UPDATE public.imports SET mapping_config =
             jsonb_set(mapping_config, '{amountColumn}', 'null')
             WHERE id = $1 AND group_id = $2`,
            [invalidImportId, fixture.groupId],
          );
        }
        await expect(
          new CorrectImportedAmountSigns1791100000000().up(runner),
        ).rejects.toThrow('Cannot correct');
        await runner.rollbackTransaction();
      } finally {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.release();
      }
      expect(await snapshot()).toEqual(before);
    },
  );

  it('normalizes both source signs on the API and atomically rejects invalid mapped source rows', async () => {
    const fixture = await reviewFixture();
    const content = Buffer.from(
      'Date;Description;Amount\n2026-06-18;Synthetic charge;25\n2026-06-19;Synthetic refund;-10\n2026-06-20;Synthetic zero;0',
    );
    const payload = importPayload({
      groupId: fixture.groupId,
      accountId: fixture.checkingAccountId,
      fileContent: content,
      rows: [-25, -10, 0].map((amount, index) => ({
        sourceRow: index + 2,
        date: `2026-06-${index + 18}`,
        amount,
        description: 'Synthetic stale-client amount',
        installmentCurrent: null,
        installmentTotal: null,
      })),
    });
    payload.config.numberFormat = 'decimal-point';
    payload.config.chargesPositive = true;
    const created = await postImport(
      fixture.memberToken,
      payload,
      content,
    ).expect(201);
    const importSummary = responseBody<{ id: string }>(created);
    expect(
      await dataSource.query(
        `SELECT inflow_total, outflow_total FROM public.imports
         WHERE id = $1 AND group_id = $2`,
        [importSummary.id, fixture.groupId],
      ),
    ).toEqual([{ inflow_total: 10, outflow_total: -25 }]);
    expect(
      await dataSource.query(
        `SELECT source_row, value FROM public.transactions
         WHERE import_id = $1 AND group_id = $2 ORDER BY source_row`,
        [importSummary.id, fixture.groupId],
      ),
    ).toEqual([
      { source_row: 2, value: -25 },
      { source_row: 3, value: 10 },
      { source_row: 4, value: 0 },
    ]);

    for (const source of ['missing', 'malformed']) {
      const invalidContent = Buffer.from(
        source === 'missing'
          ? 'Date;Description;Amount\n2026-06-18;Synthetic valid charge;25'
          : 'Date;Description;Amount\n2026-06-18;Synthetic invalid refund;not-money',
      );
      const invalidPayload = importPayload({
        groupId: fixture.groupId,
        accountId: fixture.checkingAccountId,
        fileName: `${source}.csv`,
        fileContent: invalidContent,
        rows: [
          {
            ...payload.rows[0],
            sourceRow: source === 'missing' ? 99 : 2,
            amount: -25,
          },
        ],
      });
      invalidPayload.config.chargesPositive = true;
      const rejected = await postImport(
        fixture.memberToken,
        invalidPayload,
        invalidContent,
      ).expect(400);
      expect(responseBody<{ code: string }>(rejected).code).toBe(
        'INVALID_IMPORT_SOURCE_AMOUNT',
      );
      const retained = await dataSource.query<
        Array<{ imports: number; files: number; transactions: number }>
      >(
        `SELECT
           (SELECT count(*)::integer FROM public.imports
            WHERE group_id = $1 AND file_hash = $2) AS imports,
           (SELECT count(*)::integer FROM public.import_files source
            JOIN public.imports imported ON source.import_id = imported.id
            WHERE imported.group_id = $1 AND imported.file_hash = $2) AS files,
           (SELECT count(*)::integer FROM public.transactions transaction_record
            JOIN public.imports imported ON transaction_record.import_id = imported.id
            WHERE imported.group_id = $1 AND imported.file_hash = $2) AS transactions`,
        [fixture.groupId, invalidPayload.fileHash],
      );
      expect(retained).toEqual([{ imports: 0, files: 0, transactions: 0 }]);
    }
  });

  it('previews, scopes, atomically confirms, deduplicates, profiles, and reimports CSV rows', async () => {
    const ownerId = 'b7e546de-5a5e-4c52-af48-2db8232bfd23';
    const memberId = 'ecf91ef8-fbab-4147-a3e1-ff8119965e8f';
    const outsiderId = 'c8a57f24-53fa-4f16-adce-e359f23ad042';
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
       ($1, 'import-owner@example.com', '{}'::jsonb),
       ($2, 'import-member@example.com', '{}'::jsonb),
       ($3, 'import-outsider@example.com', '{}'::jsonb)`,
      [ownerId, memberId, outsiderId],
    );
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name) VALUES ('Import Test Group') RETURNING id`,
    );
    const [{ id: otherGroupId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.groups (name) VALUES ('Other Import Group') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO public.user_group (group_id, user_id, role) VALUES
       ($1, $2, 'owner'), ($1, $3, 'member'), ($4, $5, 'owner')`,
      [groupId, ownerId, memberId, otherGroupId, outsiderId],
    );
    const [{ id: accountId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Scoped Account', 'checkout', $1, $2) RETURNING id`,
      [groupId, ownerId],
    );
    const [{ id: otherAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (name, type, group_id, user_id)
       VALUES ('Other Account', 'checking', $1, $2) RETURNING id`,
      [otherGroupId, outsiderId],
    );
    const [{ id: creditAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (
         created_at, name, type, due_date, group_id, user_id
       ) VALUES ('2025-01-01', 'Scoped Credit Card', 'credit', 5, $1, $2)
       RETURNING id`,
      [groupId, ownerId],
    );
    const memberToken = tokenFor(memberId, 'import-member@example.com');
    const outsiderToken = tokenFor(outsiderId, 'import-outsider@example.com');
    const fileContent = Buffer.from(
      'Date;Description;Amount\n2026-09-21;Synthetic imported row;5',
    );
    const payload = importPayload({
      groupId,
      accountId,
      fileContent,
      sourceFingerprint: 'd'.repeat(64),
    });

    await request(httpServer)
      .post('/imports/preview')
      .send(payload)
      .expect(401);
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send(payload)
      .expect(404);
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ...payload, accountId: otherAccountId })
      .expect(404);
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        ...payload,
        rows: [{ ...payload.rows[0], amount: null }],
      })
      .expect(400);

    const beforePreview = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count FROM public.imports
       WHERE group_id = $1 AND file_hash = $2`,
      [groupId, payload.fileHash],
    );
    const previewResponse = await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(payload)
      .expect(200);
    expect(responseBody<{ valid: boolean }>(previewResponse).valid).toBe(true);
    const afterPreview = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count FROM public.imports
       WHERE group_id = $1 AND file_hash = $2`,
      [groupId, payload.fileHash],
    );
    expect(afterPreview).toEqual(beforePreview);

    await postImport(outsiderToken, payload, fileContent).expect(404);
    await postImport(
      memberToken,
      { ...payload, fileHash: '0'.repeat(64) },
      fileContent,
    ).expect(400);
    await request(httpServer)
      .post('/imports')
      .set('Authorization', `Bearer ${memberToken}`)
      .field('payload', JSON.stringify(payload))
      .expect(400);

    const createdResponse = await postImport(
      memberToken,
      payload,
      fileContent,
    ).expect(201);
    const created = responseBody<{
      id: string;
      accountId: string;
      transactionCount: number;
    }>(createdResponse);
    expect(created).toMatchObject({ accountId, transactionCount: 1 });
    const storedFile = await dataSource.query<Array<{ content: Buffer }>>(
      `SELECT content FROM public.import_files WHERE import_id = $1`,
      [created.id],
    );
    expect(storedFile).toHaveLength(1);
    expect(storedFile[0]?.content.equals(fileContent)).toBe(true);

    const creditFileContent = Buffer.from(
      'Date;Description;Amount\n2026-09-21;Credit purchase;25',
    );
    const creditPayloadWithoutBill = importPayload({
      groupId,
      accountId: creditAccountId,
      fileName: 'credit.csv',
      fileContent: creditFileContent,
      sourceFingerprint: 'c'.repeat(64),
    });
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(creditPayloadWithoutBill)
      .expect(400);
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ...payload, billMonth: '2026-10' })
      .expect(400);

    const creditPayload = {
      ...creditPayloadWithoutBill,
      billMonth: '2026-10',
    };
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(creditPayload)
      .expect(200);
    const creditCreateResponse = await postImport(
      memberToken,
      creditPayload,
      creditFileContent,
    ).expect(201);
    const creditImport = responseBody<{
      id: string;
      billDueDate: string | null;
    }>(creditCreateResponse);
    expect(creditImport.billDueDate).toBe('2026-10-05');

    const creditDates = await dataSource.query<
      Array<{
        bill_due_date: string;
        credit_due_date: string;
        to_be_considered_at: string;
        purchase_date: string;
      }>
    >(
      `SELECT import_record.bill_due_date::text AS bill_due_date,
              transaction.credit_due_date::text AS credit_due_date,
              transaction.to_be_considered_at::text AS to_be_considered_at,
              transaction.date::date::text AS purchase_date
       FROM public.imports import_record
       JOIN public.transactions transaction
         ON transaction.import_id = import_record.id
       WHERE import_record.id = $1`,
      [creditImport.id],
    );
    expect(creditDates).toEqual([
      {
        bill_due_date: '2026-10-05',
        credit_due_date: '2026-10-05',
        to_be_considered_at: '2026-10-05',
        purchase_date: '2026-09-21',
      },
    ]);

    const manualCreditPayload = {
      groupId,
      bankaccountId: creditAccountId,
      categoryId: null,
      billMonth: '2026-11',
      date: '2026-10-20',
      description: 'Manual credit purchase',
      value: 15,
      installmentCurrent: null,
      installmentTotal: null,
      observation: null,
    };
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ...manualCreditPayload, billMonth: null })
      .expect(400);
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        ...manualCreditPayload,
        bankaccountId: accountId,
      })
      .expect(400);
    const manualCreditResponse = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(manualCreditPayload)
      .expect(201);
    expect(
      responseBody<{
        creditDueDate: string | null;
        toBeConsideredAt: string | null;
      }>(manualCreditResponse),
    ).toEqual(
      expect.objectContaining({
        creditDueDate: '2026-11-05',
        toBeConsideredAt: '2026-11-05',
      }),
    );

    const dueDateTransactions = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&startDate=2026-10-05&endDate=2026-10-05`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const dueDateTransactionIds = responseBody<{
      data: Array<{ import: { id: string } | null }>;
    }>(dueDateTransactions).data.map((transaction) => transaction.import?.id);
    expect(dueDateTransactionIds).toEqual([creditImport.id]);

    const spendingMonthCheckingResponse = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&startDate=2026-09-01&endDate=2026-09-30&accountType=checkout`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        data: Array<{ import: { id: string } | null }>;
      }>(spendingMonthCheckingResponse).data.map(
        (transaction) => transaction.import?.id,
      ),
    ).toContain(created.id);

    const spendingMonthCreditResponse = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&startDate=2026-10-01&endDate=2026-10-31&accountType=credit`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        data: Array<{ import: { id: string } | null }>;
      }>(spendingMonthCreditResponse).data.map(
        (transaction) => transaction.import?.id,
      ),
    ).toEqual([creditImport.id]);

    const billPath = `/credit-card-bills/${creditAccountId}/2026-10`;
    await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&startDate=2026-10-01&endDate=2026-10-31`,
      )
      .expect(401);
    await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&startDate=2026-10-01&endDate=2026-10-31`,
      )
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    const billListResponse = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&startDate=2026-10-01&endDate=2026-10-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const [unreconciledBill] = responseBody<
      Array<{
        accountId: string;
        billMonth: string;
        dueDate: string;
        total: number;
        status: string;
        payment: unknown;
      }>
    >(billListResponse);
    expect(unreconciledBill).toMatchObject({
      accountId: creditAccountId,
      billMonth: '2026-10',
      dueDate: '2026-10-05',
      status: 'needs-reconciliation',
      payment: null,
    });

    const emptyBillPath = `/credit-card-bills/${creditAccountId}/2026-12`;
    const emptyBillListResponse = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&startDate=2026-12-01&endDate=2026-12-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<
        Array<{
          accountId: string;
          billMonth: string;
          dueDate: string;
          transactionCount: number;
          total: number;
          status: string;
          payment: unknown;
        }>
      >(emptyBillListResponse),
    ).toEqual([
      expect.objectContaining({
        accountId: creditAccountId,
        billMonth: '2026-12',
        dueDate: '2026-12-05',
        transactionCount: 0,
        total: 0,
        status: 'empty',
        payment: null,
      }),
    ]);

    const emptyBillDetailResponse = await request(httpServer)
      .get(`${emptyBillPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const emptyBillDetail = responseBody<{
      bill: { status: string };
      transactions: unknown[];
      candidates: unknown[];
    }>(emptyBillDetailResponse);
    expect(emptyBillDetail.bill.status).toBe('empty');
    expect(emptyBillDetail.transactions).toEqual([]);
    expect(emptyBillDetail.candidates).toEqual([]);

    await request(httpServer)
      .post(`${emptyBillPath}/reconciliation`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, paymentTransactionId: '999999999' })
      .expect(400);

    const beforeAccountCreationResponse = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&startDate=2024-12-01&endDate=2024-12-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown[]>(beforeAccountCreationResponse)).toEqual([]);

    const billDetailBeforePayment = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        transactions: Array<{ calculatedDate: string }>;
        candidates: unknown[];
      }>(billDetailBeforePayment),
    ).toMatchObject({
      transactions: [expect.objectContaining({ calculatedDate: '2026-09-21' })],
      candidates: [],
    });

    const billTotal = unreconciledBill?.total ?? 0;
    const paymentValue = billTotal > 0 ? -billTotal : Math.abs(billTotal);
    const paymentResponse = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        groupId,
        bankaccountId: accountId,
        categoryId: null,
        billMonth: null,
        date: '2026-10-05',
        description: 'Credit card bill payment',
        value: paymentValue,
        installmentCurrent: null,
        installmentTotal: null,
        observation: null,
      })
      .expect(201);
    const paymentTransaction = responseBody<{
      id: string;
      billPayment: unknown;
    }>(paymentResponse);
    expect(paymentTransaction.billPayment).toBeNull();

    const billDetailWithCandidate = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        candidates: Array<{ transactionId: string }>;
      }>(billDetailWithCandidate).candidates,
    ).toEqual([
      expect.objectContaining({ transactionId: paymentTransaction.id }),
    ]);

    await request(httpServer)
      .post(`${billPath}/reconciliation`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ groupId, paymentTransactionId: paymentTransaction.id })
      .expect(404);
    const reconciliationResponse = await request(httpServer)
      .post(`${billPath}/reconciliation`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, paymentTransactionId: paymentTransaction.id })
      .expect(200);
    expect(
      responseBody<{
        bill: {
          status: string;
          payment: { transactionId: string } | null;
        };
      }>(reconciliationResponse).bill,
    ).toMatchObject({
      status: 'reconciled',
      payment: { transactionId: paymentTransaction.id },
    });

    const inlinePaymentResponse = await request(httpServer)
      .get(`/transactions?groupId=${groupId}&accountType=checkout`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const inlinePayment = responseBody<{
      data: Array<{
        id: string;
        billPayment: { creditAccountId: string; billMonth: string } | null;
      }>;
    }>(inlinePaymentResponse).data.find(
      (transaction) => transaction.id === paymentTransaction.id,
    );
    expect(inlinePayment).toBeUndefined();

    const [creditTransaction] = await dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM public.transactions WHERE import_id = $1`,
      [creditImport.id],
    );
    await request(httpServer)
      .patch(`/transactions/${creditTransaction?.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ value: billTotal + (billTotal >= 0 ? 1 : -1) })
      .expect(200);
    const changedBillResponse = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ bill: { status: string; payment: unknown } }>(
        changedBillResponse,
      ).bill,
    ).toMatchObject({ status: 'needs-review' });

    await request(httpServer)
      .delete(`${billPath}/reconciliation?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const unlinkedBillResponse = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        bill: { status: string; payment: unknown };
      }>(unlinkedBillResponse).bill,
    ).toMatchObject({ status: 'needs-reconciliation', payment: null });

    const profiles = await request(httpServer)
      .get(
        `/imports/profiles?groupId=${groupId}&fingerprint=${payload.sourceFingerprint}`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<Array<{ accountId: string }>>(profiles)).toEqual([
      expect.objectContaining({ accountId }),
    ]);
    await request(httpServer)
      .get(
        `/imports/profiles?groupId=${groupId}&fingerprint=${payload.sourceFingerprint}`,
      )
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);

    const duplicatePreview = await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(payload)
      .expect(200);
    expect(
      responseBody<{ valid: boolean; duplicate: { importId: string } }>(
        duplicatePreview,
      ),
    ).toMatchObject({ valid: false, duplicate: { importId: created.id } });
    const duplicateCreate = await postImport(
      memberToken,
      payload,
      fileContent,
    ).expect(409);
    expect(responseBody<{ code: string }>(duplicateCreate).code).toBe(
      'DUPLICATE_IMPORT',
    );

    const raceFileContent = Buffer.from(
      'Date;Description;Amount\n2026-09-22;Race-safe row;7',
    );
    const racePayload = importPayload({
      groupId,
      accountId,
      fileName: 'race-safe.csv',
      fileContent: raceFileContent,
      sourceFingerprint: payload.sourceFingerprint,
    });
    const raceResults = await Promise.all([
      postImport(memberToken, racePayload, raceFileContent),
      postImport(memberToken, racePayload, raceFileContent),
    ]);
    expect(raceResults.map((result) => result.status).sort()).toEqual([
      201, 409,
    ]);

    await request(httpServer)
      .delete(`/imports/${created.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const retainedFile = await dataSource.query<Array<{ content: Buffer }>>(
      `SELECT content FROM public.import_files WHERE import_id = $1`,
      [created.id],
    );
    expect(retainedFile[0]?.content.equals(fileContent)).toBe(true);
    await postImport(memberToken, payload, fileContent).expect(201);

    await dataSource.query(`
      CREATE OR REPLACE FUNCTION public.fail_synthetic_import_row()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        IF NEW.source_row = 999 THEN
          RAISE EXCEPTION 'synthetic persistence failure';
        END IF;
        RETURN NEW;
      END;
      $function$;
      CREATE TRIGGER fail_synthetic_import_row
      BEFORE INSERT ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.fail_synthetic_import_row();
    `);
    const rollbackFileContent = Buffer.from(
      'Date;Description;Amount\n2026-09-22;Synthetic rollback row;1',
    );
    const rollbackPayload = importPayload({
      groupId,
      accountId,
      fileContent: rollbackFileContent,
      rows: [
        {
          sourceRow: 999,
          date: '2026-09-22',
          amount: 1,
          description: 'Synthetic rollback row',
          installmentCurrent: null,
          installmentTotal: null,
        },
      ],
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    try {
      await postImport(
        memberToken,
        rollbackPayload,
        rollbackFileContent,
      ).expect(500);
    } finally {
      consoleSpy.mockRestore();
      await dataSource.query(
        'DROP TRIGGER fail_synthetic_import_row ON public.transactions',
      );
      await dataSource.query(
        'DROP FUNCTION public.fail_synthetic_import_row()',
      );
    }
    const rolledBack = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count FROM public.imports
       WHERE group_id = $1 AND file_hash = $2`,
      [groupId, rollbackPayload.fileHash],
    );
    expect(rolledBack[0]?.count).toBe(0);
    const rolledBackFile = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::integer AS count
       FROM public.import_files import_file
       JOIN public.imports import_record
         ON import_record.id = import_file.import_id
       WHERE import_record.group_id = $1 AND import_record.file_hash = $2`,
      [groupId, rollbackPayload.fileHash],
    );
    expect(rolledBackFile[0]?.count).toBe(0);
  });

  it('returns complete bill purchases beyond the transaction page limit without leaking other bills or tenants', async () => {
    const {
      groupId,
      otherGroupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      memberToken,
      outsiderToken,
    } = await reviewFixture();
    const [{ id: siblingCreditAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (created_at, name, type, due_date, group_id, user_id)
       SELECT '2025-01-01', 'Second synthetic card', 'credit', 5, group_id, user_id
       FROM public.bankaccounts WHERE id = $1
       RETURNING id`,
      [creditAccountId],
    );
    const purchases = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.transactions (
         description, value, date, date_is_utc, calculated_date,
         credit_due_date, bankaccount_id, group_id, removed
       ) SELECT 'Synthetic complete-bill purchase',
           CASE WHEN entry = 5001 THEN 25 ELSE -1 END,
           CASE WHEN entry = 5001 THEN '2026-01-10'::date ELSE '2026-06-18'::date END,
           true,
           CASE WHEN entry = 5001 THEN '2026-01-10'::date ELSE '2026-06-18'::date END,
           '2026-07-05', $1, $2, false
         FROM generate_series(1, 5001) AS entry
         RETURNING id`,
      [creditAccountId, groupId],
    );
    await dataSource.query(
      `INSERT INTO public.transactions (
         description, value, date, date_is_utc, calculated_date,
         credit_due_date, bankaccount_id, group_id, removed
       ) VALUES
         ('Synthetic excluded row', -999, '2026-06-18', true, '2026-06-18', '2026-07-05', $1, $2, true),
         ('Synthetic excluded row', -999, '2026-06-18', true, '2026-06-18', '2026-08-05', $1, $2, false),
         ('Synthetic excluded row', -999, '2026-06-18', true, '2026-06-18', '2026-07-05', $3, $2, false),
         ('Synthetic excluded row', -999, '2026-06-18', true, '2026-06-18', NULL, $4, $2, false),
         ('Synthetic excluded row', -999, '2026-06-18', true, '2026-06-18', '2026-07-05', $5, $6, false)`,
      [
        creditAccountId,
        groupId,
        siblingCreditAccountId,
        checkingAccountId,
        otherCreditAccountId,
        otherGroupId,
      ],
    );

    const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
    const detailResponse = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const detail = responseBody<{
      bill: { transactionCount: number; total: number };
      transactions: Array<{
        id: string;
        value: number;
        group: { id: string };
        bankaccount: { id: string };
        creditDueDate: string;
      }>;
    }>(detailResponse);
    expect(detail.bill).toMatchObject({
      transactionCount: 5001,
      total: -4975,
    });
    expect(detail.bill).not.toHaveProperty('matchingTransactionCount');
    expect(detail.bill).not.toHaveProperty('matchingTotal');
    expect(detail.transactions).toHaveLength(detail.bill.transactionCount);
    const transactionIds = new Set(detail.transactions.map(({ id }) => id));
    expect(transactionIds.size).toBe(purchases.length);
    expect(purchases.every(({ id }) => transactionIds.has(id))).toBe(true);
    expect(
      detail.transactions.every(
        (transaction) =>
          transaction.group.id === groupId &&
          transaction.bankaccount.id === creditAccountId &&
          transaction.creditDueDate === '2026-07-05',
      ),
    ).toBe(true);
    expect(
      detail.transactions.reduce((total, { value }) => total + value, 0),
    ).toBe(detail.bill.total);

    const filteredBillResponse = await request(httpServer)
      .get('/credit-card-bills')
      .query({
        groupId,
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        accountIdList: creditAccountId,
        minValue: 25,
        maxValue: 25,
      })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown[]>(filteredBillResponse)).toEqual([
      expect.objectContaining({
        accountId: creditAccountId,
        billMonth: '2026-07',
        transactionCount: 5001,
        total: -4975,
        matchingTransactionCount: 1,
        matchingTotal: 25,
      }),
    ]);

    const transactionQuery = `/transactions?groupId=${groupId}&accountIdList=${creditAccountId}&startDate=2026-07-01&endDate=2026-07-31`;
    const pageResponse = await request(httpServer)
      .get(`${transactionQuery}&page=0&pageSize=2`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const page = responseBody<{ data: unknown[]; totalCount: number }>(
      pageResponse,
    );
    expect(page.data).toHaveLength(2);
    expect(page.totalCount).toBe(5001);
    await request(httpServer)
      .get(`${transactionQuery}&pageSize=5001`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(400);

    await request(httpServer).get(`${billPath}?groupId=${groupId}`).expect(401);
    await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    const foreignResponse = await request(httpServer)
      .get(`${billPath}?groupId=${otherGroupId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    const missingResponse = await request(httpServer)
      .get(`/credit-card-bills/999999999/2026-07?groupId=${otherGroupId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    expect(
      responseBody<{ code: string; message: string }>(foreignResponse),
    ).toMatchObject({
      code: responseBody<{ code: string }>(missingResponse).code,
      message: responseBody<{ message: string }>(missingResponse).message,
    });
  }, 30_000);

  it('combines account, import and signed value filters before pagination without disclosing foreign references', async () => {
    const {
      groupId,
      otherGroupId,
      checkingAccountId,
      creditAccountId,
      otherCreditAccountId,
      memberToken,
      outsiderToken,
    } = await reviewFixture();
    const [category, otherCategory] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.categories (name, group_id) VALUES
       ('Synthetic filter category', $1), ('Synthetic foreign category', $2)
       RETURNING id`,
      [groupId, otherGroupId],
    );

    const importIds: string[] = [];
    for (const [accountId, values, tenantId, token] of [
      [checkingAccountId, [-50, -25, 0], groupId, memberToken],
      [checkingAccountId, [-25], groupId, memberToken],
      [creditAccountId, [-25], groupId, memberToken],
      [otherCreditAccountId, [-25], otherGroupId, outsiderToken],
    ] as const) {
      const content = Buffer.from(
        `Date;Description;Amount\n${values.map((value) => `18/06/2026;Synthetic filter import ${importIds.length};${value}`).join('\n')}`,
      );
      const response = await postImport(
        token,
        importPayload({
          groupId: tenantId,
          accountId,
          fileContent: content,
          billMonth: accountId === checkingAccountId ? null : '2026-07',
          rows: values.map((value: number, index: number) => ({
            sourceRow: index + 2,
            date: '2026-06-18',
            amount: value,
            description: `Synthetic filter import ${importIds.length}`,
            installmentCurrent: null,
            installmentTotal: null,
          })),
        }),
        content,
      ).expect(201);
      importIds.push(responseBody<{ id: string }>(response).id);
    }
    await dataSource.query(
      'UPDATE public.transactions SET category_id = $1 WHERE import_id = $2 AND value = -25',
      [category.id, importIds[0]],
    );
    const manualIds: string[] = [];
    for (const value of [-25, 0, 25]) {
      const response = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, checkingAccountId, {
            value,
            description: 'Synthetic filter manual',
          }),
        )
        .expect(201);
      manualIds.push(responseBody<{ id: string }>(response).id);
    }
    const filterQuery = {
      groupId,
      accountIdList: checkingAccountId,
      categoryIdList: [category.id, '-1'],
      importSource: 'imported',
      importIdList: importIds.slice(0, 2),
      minValue: -25,
      maxValue: 0,
      search: 'filter',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    };
    const selectedIds: string[] = [];
    for (let page = 0; page < 3; page++) {
      const response = await request(httpServer)
        .get('/transactions')
        .query({ ...filterQuery, page, pageSize: 1 })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const result = responseBody<{
        totalCount: number;
        data: Array<{
          id: string;
          value: number;
          import: { id: string };
          bankaccount: { id: string };
        }>;
      }>(response);
      expect(result.totalCount).toBe(3);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].value).toBeGreaterThanOrEqual(-25);
      expect(result.data[0].value).toBeLessThanOrEqual(0);
      expect(result.data[0].bankaccount.id).toBe(checkingAccountId);
      expect(importIds.slice(0, 2)).toContain(result.data[0].import.id);
      selectedIds.push(result.data[0].id);
    }
    expect(new Set(selectedIds).size).toBe(3);

    for (const [filters, expectedIds] of [
      [{ importSource: 'manual', minValue: 0, maxValue: 0 }, [manualIds[1]]],
      [{ importSource: 'manual', minValue: 25 }, [manualIds[2]]],
      [{ importSource: 'manual', maxValue: -25 }, [manualIds[0]]],
      [{ importSource: 'manual', importIdList: importIds[0] }, []],
    ] as const) {
      const response = await request(httpServer)
        .get('/transactions')
        .query({ groupId, ...filters })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const result = responseBody<{
        totalCount: number;
        data: Array<{ id: string }>;
      }>(response);
      expect(result.totalCount).toBe(expectedIds.length);
      expect(result.data.map(({ id }) => id).sort()).toEqual(
        [...expectedIds].sort(),
      );
    }

    for (const path of ['/transactions', '/credit-card-bills']) {
      for (const [key, foreignId] of [
        ['accountIdList', otherCreditAccountId],
        ['categoryIdList', otherCategory.id],
        ['importIdList', importIds[3]],
      ]) {
        const responses: unknown[] = [];
        for (const id of [foreignId, '999999999']) {
          const response = await request(httpServer)
            .get(path)
            .query({ groupId, [key]: id })
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);
          responses.push(response.body as unknown);
        }
        expect(responses[0]).toEqual(responses[1]);
        expect(responses[0]).toEqual(
          path === '/transactions' ? { data: [], totalCount: 0 } : [],
        );
      }
      await request(httpServer)
        .get(path)
        .query({ groupId, importSource: 'imported' })
        .expect(401);
      await request(httpServer)
        .get(path)
        .query({ groupId, importSource: 'imported' })
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(404);
      for (const invalid of [
        { minValue: 1, maxValue: -1 },
        { minValue: '' },
        { maxValue: 'Infinity' },
        { importSource: 'csv' },
        { importIdList: 'other' },
      ]) {
        const response = await request(httpServer)
          .get(path)
          .query({ groupId, ...invalid })
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);
        expect(responseBody<{ code: string }>(response).code).toBe(
          'INVALID_REQUEST',
        );
      }
    }
  });

  it('matches all grouped bill purchase filters on one purchase while preserving the complete reconciled bill', async () => {
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      await reviewFixture();
    const [{ id: categoryId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.categories (name, group_id)
       VALUES ('Synthetic filtered purchase', $1) RETURNING id`,
      [groupId],
    );
    const content = Buffer.from(
      'Date;Description;Amount\n18/06/2026;Synthetic matching import;-35\n19/06/2026;Synthetic imported refund;5',
    );
    const importedResponse = await postImport(
      memberToken,
      importPayload({
        groupId,
        accountId: creditAccountId,
        billMonth: '2026-07',
        fileContent: content,
        rows: [-35, 5].map((amount, index) => ({
          sourceRow: index + 2,
          date: `2026-06-${18 + index}`,
          amount,
          description:
            index === 0
              ? 'Synthetic matching import'
              : 'Synthetic imported refund',
          installmentCurrent: null,
          installmentTotal: null,
        })),
      }),
      content,
    ).expect(201);
    const importId = responseBody<{ id: string }>(importedResponse).id;
    await dataSource.query(
      'UPDATE public.transactions SET category_id = $1 WHERE import_id = $2 AND value = -35',
      [categoryId, importId],
    );
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, creditAccountId, {
          billMonth: '2026-07',
          value: -10,
          description: 'Synthetic manual purchase',
        }),
      )
      .expect(201);
    const paymentResponse = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, checkingAccountId, {
          date: '2026-07-05',
          value: -40,
        }),
      )
      .expect(201);
    const paymentId = responseBody<{ id: string }>(paymentResponse).id;
    await request(httpServer)
      .post(`/credit-card-bills/${creditAccountId}/2026-07/reconciliation`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, paymentTransactionId: paymentId })
      .expect(200);
    const matchingQuery = {
      groupId,
      dateBasis: 'monthly-review',
      reviewMonths: '2026-06',
      accountIdList: creditAccountId,
      categoryIdList: categoryId,
      search: 'matching',
      importSource: 'imported',
      importIdList: importId,
      minValue: -35,
      maxValue: -35,
    };
    const response = await request(httpServer)
      .get('/credit-card-bills')
      .query(matchingQuery)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown[]>(response)).toHaveLength(1);
    expect(responseBody<unknown[]>(response)).toMatchObject([
      {
        accountId: creditAccountId,
        billMonth: '2026-07',
        reviewMonth: '2026-06',
        total: -40,
        transactionCount: 3,
        matchingTotal: -35,
        matchingTransactionCount: 1,
        status: 'reconciled',
        payment: { transactionId: paymentId },
      },
    ]);
    const matchingTransactionsResponse = await request(httpServer)
      .get('/transactions')
      .query(matchingQuery)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const matchingTransactions = responseBody<{
      data: Array<{ value: number }>;
      totalCount: number;
    }>(matchingTransactionsResponse);
    const [matchingBill] =
      responseBody<
        Array<{ matchingTransactionCount: number; matchingTotal: number }>
      >(response);
    expect(matchingTransactions.totalCount).toBe(
      matchingBill.matchingTransactionCount,
    );
    expect(
      matchingTransactions.data.reduce(
        (sum, transaction) => sum + transaction.value,
        0,
      ),
    ).toBe(matchingBill.matchingTotal);
    for (const overrides of [
      { importSource: 'manual', importIdList: undefined, search: undefined },
      {
        minValue: -10,
        maxValue: -10,
        categoryIdList: undefined,
        search: undefined,
      },
      { categoryIdList: '-1' },
      { accountIdList: checkingAccountId },
    ]) {
      const excluded = await request(httpServer)
        .get('/credit-card-bills')
        .query({ ...matchingQuery, ...overrides })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(responseBody<unknown[]>(excluded)).toEqual([]);
    }
    const emptyResponse = await request(httpServer)
      .get('/credit-card-bills')
      .query({
        groupId,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        minValue: 0,
        maxValue: 0,
      })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown[]>(emptyResponse)).toEqual([]);
  });

  it('filters calculated review months before pagination and includes active and empty bills across years', async () => {
    const {
      groupId,
      otherGroupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      memberToken,
      outsiderToken,
    } = await reviewFixture();
    const emptyAccount = responseBody<BankaccountOutput>(
      await request(httpServer)
        .post('/bankaccounts')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          groupId,
          name: 'Synthetic empty review account',
          type: 'credit',
          dueDate: 5,
        })
        .expect(201),
    );

    const selectedIds: string[] = [];
    const transactions = [
      { bankaccountId: checkingAccountId, date: '2026-12-08' },
      { bankaccountId: checkingAccountId, date: '2027-02-08' },
      {
        bankaccountId: creditAccountId,
        date: '2026-06-18',
        billMonth: '2027-01',
      },
      {
        bankaccountId: creditAccountId,
        date: '2026-06-19',
        billMonth: '2027-03',
      },
    ];
    for (const { bankaccountId, ...overrides } of transactions) {
      const response = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reviewTransaction(groupId, bankaccountId, overrides))
        .expect(201);
      selectedIds.push(responseBody<{ id: string }>(response).id);
    }
    for (const [bankaccountId, overrides] of [
      [checkingAccountId, { date: '2027-05-01' }],
      [creditAccountId, { date: '2027-06-01', billMonth: '2027-02' }],
    ] as const) {
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reviewTransaction(groupId, bankaccountId, overrides))
        .expect(201);
    }
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send(
        reviewTransaction(otherGroupId, otherCreditAccountId, {
          billMonth: '2026-12',
        }),
      )
      .expect(201);
    const selectedQuery = {
      groupId,
      dateBasis: 'monthly-review',
      reviewMonths: ['2027-02', '2026-12', '2027-02'],
      // Explicit selection overrides legacy bounds, even when narrower.
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    };
    const selectedPages: string[] = [];
    for (let page = 0; page < 2; page++) {
      const response = await request(httpServer)
        .get('/transactions')
        .query({ ...selectedQuery, page, pageSize: 2 })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const result = responseBody<{
        totalCount: number;
        data: Array<{ id: string; reviewMonth: string }>;
      }>(response);
      expect(result.totalCount).toBe(4);
      expect(result.data).toHaveLength(2);
      expect(
        result.data.every(({ reviewMonth }) =>
          ['2026-12', '2027-02'].includes(reviewMonth),
        ),
      ).toBe(true);
      selectedPages.push(...result.data.map(({ id }) => id));
    }
    expect(selectedPages.sort()).toEqual(selectedIds.sort());

    const billsResponse = await request(httpServer)
      .get('/credit-card-bills')
      .query(selectedQuery)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const bills = responseBody<
      Array<{
        accountId: string;
        billMonth: string;
        reviewMonth: string;
        status: string;
      }>
    >(billsResponse);
    expect(bills).toHaveLength(4);
    expect(
      bills.every(({ accountId }) =>
        [creditAccountId, emptyAccount.id].includes(accountId),
      ),
    ).toBe(true);
    expect(bills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: emptyAccount.id,
          billMonth: '2027-03',
          reviewMonth: '2027-02',
          status: 'empty',
        }),
        expect.objectContaining({
          accountId: creditAccountId,
          billMonth: '2027-01',
          reviewMonth: '2026-12',
        }),
        expect.objectContaining({
          billMonth: '2027-01',
          reviewMonth: '2026-12',
          accountId: emptyAccount.id,
          status: 'empty',
        }),
        expect.objectContaining({
          billMonth: '2027-03',
          reviewMonth: '2027-02',
          accountId: creditAccountId,
        }),
      ]),
    );

    for (const path of ['/transactions', '/credit-card-bills']) {
      await request(httpServer)
        .get(path)
        .query(selectedQuery)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(404);
      for (const invalidQuery of [
        { ...selectedQuery, reviewMonths: ['2027-13'] },
        { ...selectedQuery, dateBasis: 'cash-flow' },
      ]) {
        const invalidResponse = await request(httpServer)
          .get(path)
          .query(invalidQuery)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);
        expect(responseBody<{ code: string }>(invalidResponse).code).toBe(
          'INVALID_REQUEST',
        );
      }
    }
  });

  it('keeps calculated scheduled bills within supported calendar boundaries', async () => {
    const { groupId, creditAccountId, memberToken } = await reviewFixture();
    await dataSource.query(
      'UPDATE public.bankaccounts SET created_at = $1 WHERE id = $2',
      ['0001-01-01', creditAccountId],
    );
    const response = await request(httpServer)
      .get('/credit-card-bills')
      .query({
        groupId,
        dateBasis: 'monthly-review',
        reviewMonths: ['0001-01', '9999-12'],
      })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown[]>(response)).toEqual([
      expect.objectContaining({
        accountId: creditAccountId,
        billMonth: '0001-02',
        dueDate: '0001-02-05',
        reviewMonth: '0001-01',
        status: 'empty',
      }),
    ]);
  });

  it('automatically reviews next-month bills while preserving purchase dates, cash flow and confirmed payments', async () => {
    const fixture = await reviewFixture();
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      fixture;
    const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
    const purchaseDates = ['2026-06-18', '2026-07-01', '2026-01-10'];
    const purchaseIds: string[] = [];
    for (const date of purchaseDates) {
      const response = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            date,
            billMonth: '2026-07',
          }),
        )
        .expect(201);
      const purchase = responseBody<{ id: string; reviewMonth: string }>(
        response,
      );
      purchaseIds.push(purchase.id);
      expect(purchase.reviewMonth).toBe('2026-06');
    }

    const unchanged = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ bill: { reviewMonth: string } }>(unchanged).bill
        .reviewMonth,
    ).toBe('2026-06');

    const changed = await request(httpServer)
      .get(billPath)
      .query({ groupId })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const changedBill = responseBody<{
      bill: unknown;
      transactions: Array<{ id: string; reviewMonth: string }>;
    }>(changed);
    expect(changedBill.bill).toMatchObject({
      billMonth: '2026-07',
      dueDate: '2026-07-05',
      reviewMonth: '2026-06',
    });
    expect(changedBill.transactions.map(({ id }) => id).sort()).toEqual(
      [...purchaseIds].sort(),
    );
    expect(
      changedBill.transactions.every(
        ({ reviewMonth }) => reviewMonth === '2026-06',
      ),
    ).toBe(true);
    const persistedPurchases = await dataSource.query<
      Array<{ purchase_date: string; due_date: string }>
    >(
      `SELECT date::date::text AS purchase_date, credit_due_date::text AS due_date
       FROM public.transactions WHERE id = ANY($1::bigint[]) ORDER BY date`,
      [purchaseIds],
    );
    expect(persistedPurchases).toEqual(
      [...purchaseDates]
        .sort()
        .map((purchase_date) => ({ purchase_date, due_date: '2026-07-05' })),
    );
    const juneReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(juneReview)
        .data.map(({ id }) => id)
        .sort(),
    ).toEqual([...purchaseIds].sort());
    const partialMonthReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-02&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<{ data: unknown[] }>(partialMonthReview).data).toEqual(
      [],
    );
    const julyCashFlow = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-07-01&endDate=2026-07-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(julyCashFlow)
        .data.map(({ id }) => id)
        .sort(),
    ).toEqual([...purchaseIds].sort());
    const juneBills = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<Array<{ billMonth: string; reviewMonth: string }>>(
        juneBills,
      ),
    ).toEqual([
      expect.objectContaining({ billMonth: '2026-07', reviewMonth: '2026-06' }),
    ]);

    for (const [billMonth, expectedReviewMonth] of [
      ['2026-08', '2026-07'],
      ['2027-01', '2026-12'],
    ]) {
      const response = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reviewTransaction(groupId, creditAccountId, { billMonth }))
        .expect(201);
      expect(responseBody<{ reviewMonth: string }>(response).reviewMonth).toBe(
        expectedReviewMonth,
      );
    }
    const payment = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, checkingAccountId, {
          date: '2026-06-30',
          value: -30,
        }),
      )
      .expect(201);
    const paymentId = responseBody<{ id: string }>(payment).id;
    await request(httpServer)
      .post(`${billPath}/reconciliation`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, paymentTransactionId: paymentId })
      .expect(200);
    const julyReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-07-01&endDate=2026-07-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(julyReview).data.map(
        ({ id }) => id,
      ),
    ).not.toContain(paymentId);
    const cashPayment = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const paidPurchases = responseBody<{
      data: Array<{ id: string; cashFlowDate: string }>;
    }>(cashPayment).data;
    expect(paidPurchases.map(({ id }) => id).sort()).toEqual(
      [...purchaseIds].sort(),
    );
    expect(
      paidPurchases.every(({ cashFlowDate }) => cashFlowDate === '2026-06-30'),
    ).toBe(true);
    const paidJuneReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(paidJuneReview)
        .data.map(({ id }) => id)
        .sort(),
    ).toEqual([...purchaseIds].sort());
    const paidBill = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<{ bill: unknown }>(paidBill).bill).toMatchObject({
      dueDate: '2026-07-05',
      cashFlowDate: '2026-06-30',
      reviewMonth: '2026-06',
      payment: { transactionId: paymentId },
    });
    const julyPaidBills = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-07-01&endDate=2026-07-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<Array<{ billMonth: string }>>(julyPaidBills).map(
        ({ billMonth }) => billMonth,
      ),
    ).not.toContain('2026-07');
    const junePaidBills = await request(httpServer)
      .get(
        `/credit-card-bills?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<Array<{ billMonth: string }>>(junePaidBills)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          billMonth: '2026-07',
          cashFlowDate: '2026-06-30',
        }),
      ]),
    );
  });

  it('retires review-setting routes and rejects client-selected months without changing records or exposing foreign bills', async () => {
    const {
      groupId,
      otherGroupId,
      creditAccountId,
      checkingAccountId,
      otherCreditAccountId,
      memberToken,
      ownerToken,
      outsiderToken,
    } = await reviewFixture();
    const purchase = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', 'Bearer ' + memberToken)
        .send(
          reviewTransaction(groupId, creditAccountId, { billMonth: '2026-02' }),
        )
        .expect(201),
    );
    for (const token of [ownerToken, memberToken, outsiderToken]) {
      await request(httpServer)
        .patch('/groups/' + groupId + '/review-settings')
        .set('Authorization', 'Bearer ' + token)
        .send({ creditCardReviewMonthOffset: 0 })
        .expect(404);
      await request(httpServer)
        .patch(
          '/credit-card-bills/' + creditAccountId + '/2026-02/review-month',
        )
        .set('Authorization', 'Bearer ' + token)
        .send({ groupId, reviewMonth: '2026-03' })
        .expect(404);
    }
    for (const accountId of [creditAccountId, checkingAccountId]) {
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', 'Bearer ' + memberToken)
        .send({
          ...reviewTransaction(groupId, accountId, {
            billMonth: accountId === creditAccountId ? '2026-02' : null,
          }),
          reviewMonth: '2026-03',
        })
        .expect(400);
    }
    for (const input of [
      { reviewMonth: '2026-03' },
      { groupId: otherGroupId },
      { userId: randomUUID() },
    ]) {
      const denied = await request(httpServer)
        .patch('/transactions/' + purchase.id)
        .set('Authorization', 'Bearer ' + memberToken)
        .send(input)
        .expect(400);
      expect(responseBody<{ code: string }>(denied).code).toBe(
        'INVALID_REQUEST',
      );
    }
    expect(
      responseBody<TransactionOutput>(
        await request(httpServer)
          .get('/transactions/' + purchase.id)
          .set('Authorization', 'Bearer ' + memberToken)
          .expect(200),
      ),
    ).toEqual(purchase);
    for (const accountId of [otherCreditAccountId, '999999999']) {
      const denied = await request(httpServer)
        .get('/credit-card-bills/' + accountId + '/2026-02')
        .query({ groupId })
        .set('Authorization', 'Bearer ' + memberToken)
        .expect(404);
      expect(
        responseBody<{ code: string; message: string }>(denied),
      ).toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
      });
    }
    for (const path of ['/transactions', '/credit-card-bills']) {
      await request(httpServer)
        .get(path)
        .query({
          groupId,
          dateBasis: 'monthly-review',
          reviewMonths: '2026-01',
        })
        .set('Authorization', 'Bearer ' + outsiderToken)
        .expect(404);
    }
  });

  it('derives the same month for imports, reimports and concurrent files without saving an assignment', async () => {
    const { groupId, creditAccountId, memberToken } = await reviewFixture();
    const content = Buffer.from(
      'Date;Description;Amount\n20/01/2026;Synthetic automatic review;-10',
    );
    const payload = importPayload({
      groupId,
      accountId: creditAccountId,
      billMonth: '2026-02',
      fileContent: content,
      rows: [
        {
          sourceRow: 2,
          date: '2026-01-20',
          amount: -10,
          description: 'Synthetic automatic review',
          installmentCurrent: null,
          installmentTotal: null,
        },
      ],
    });
    const invalidPayload = { ...payload, reviewMonth: '2026-03' };
    await request(httpServer)
      .post('/imports/preview')
      .set('Authorization', 'Bearer ' + memberToken)
      .send(invalidPayload)
      .expect(400);
    await postImport(memberToken, invalidPayload, content).expect(400);
    const first = responseBody<ImportSummary>(
      await postImport(memberToken, payload, content).expect(201),
    );
    const manual = responseBody<TransactionOutput>(
      await request(httpServer)
        .post('/transactions')
        .set('Authorization', 'Bearer ' + memberToken)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            date: '2026-01-21',
            billMonth: '2026-02',
          }),
        )
        .expect(201),
    );
    const readBill = async (month: string) =>
      responseBody<CreditCardBillDetail>(
        await request(httpServer)
          .get('/credit-card-bills/' + creditAccountId + '/' + month)
          .query({ groupId })
          .set('Authorization', 'Bearer ' + memberToken)
          .expect(200),
      );
    expect((await readBill('2026-02')).bill).toMatchObject({
      reviewMonth: '2026-01',
      total: -20,
      transactionCount: 2,
    });
    await request(httpServer)
      .delete('/imports/' + first.id)
      .set('Authorization', 'Bearer ' + memberToken)
      .expect(200);
    await postImport(memberToken, payload, content).expect(201);
    const reimported = await readBill('2026-02');
    expect(reimported.bill).toMatchObject({
      reviewMonth: '2026-01',
      total: -20,
      transactionCount: 2,
    });
    expect(reimported.transactions.find(({ id }) => id === manual.id)).toEqual(
      manual,
    );
    const results = await Promise.all(
      [20, 30].map((amount) => {
        const fileContent = Buffer.from(
          'Date;Description;Amount\n20/02/2026;Synthetic concurrent ' +
            amount +
            ';-' +
            amount,
        );
        return postImport(
          memberToken,
          importPayload({
            groupId,
            accountId: creditAccountId,
            billMonth: '2026-03',
            fileContent,
            rows: [
              {
                sourceRow: 2,
                date: '2026-02-20',
                amount: -amount,
                description: 'Synthetic concurrent ' + amount,
                installmentCurrent: null,
                installmentTotal: null,
              },
            ],
          }),
          fileContent,
        ).expect(201);
      }),
    );
    expect(results).toHaveLength(2);
    const concurrentBill = await readBill('2026-03');
    expect(concurrentBill.bill).toMatchObject({
      reviewMonth: '2026-02',
      total: -50,
      transactionCount: 2,
    });
    expect(
      concurrentBill.transactions.every(
        ({ reviewMonth }) => reviewMonth === '2026-02',
      ),
    ).toBe(true);
    const [{ originals }] = await dataSource.query<
      Array<{ originals: number }>
    >(
      'SELECT count(*)::integer AS originals FROM public.import_files source JOIN public.imports record ON record.id = source.import_id WHERE record.group_id = $1',
      [groupId],
    );
    expect(originals).toBe(4);
  });

  it.each(['purchases', 'import'] as const)(
    'retains a confirmed cash payment after all bill %s are removed, including archived cards',
    async (removedResource) => {
      const { groupId, creditAccountId, checkingAccountId, memberToken } =
        await reviewFixture();
      const fileContent = Buffer.from(
        'Date;Description;Amount\n2026-06-18;Synthetic removable purchase;-10',
      );
      const payload = importPayload({
        groupId,
        accountId: creditAccountId,
        billMonth: '2026-07',
        fileContent,
        rows: [
          {
            sourceRow: 2,
            date: '2026-06-18',
            amount: -10,
            description: 'Synthetic removable purchase',
            installmentCurrent: null,
            installmentTotal: null,
          },
        ],
      });
      const imported = await postImport(
        memberToken,
        payload,
        fileContent,
      ).expect(201);
      const importId = responseBody<{ id: string }>(imported).id;
      const paymentResponse = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, checkingAccountId, { date: '2026-06-30' }),
        )
        .expect(201);
      const paymentId = responseBody<{ id: string }>(paymentResponse).id;
      const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
      const reconciled = await request(httpServer)
        .post(`${billPath}/reconciliation`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ groupId, paymentTransactionId: paymentId })
        .expect(200);
      const purchases = responseBody<{ transactions: Array<{ id: string }> }>(
        reconciled,
      ).transactions;
      expect(purchases).toHaveLength(1);
      if (removedResource === 'import') {
        await request(httpServer)
          .delete(`/imports/${importId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
      } else {
        for (const purchase of purchases) {
          await request(httpServer)
            .delete(`/transactions/${purchase.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);
        }
      }

      for (const archived of [false, true]) {
        if (archived) {
          await request(httpServer)
            .delete(`/bankaccounts/${creditAccountId}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);
        }
        const detail = await request(httpServer)
          .get(`${billPath}?groupId=${groupId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(
          responseBody<{ bill: unknown; transactions: unknown[] }>(detail),
        ).toMatchObject({
          bill: {
            accountId: creditAccountId,
            billMonth: '2026-07',
            reviewMonth: '2026-06',
            dueDate: '2026-07-05',
            cashFlowDate: '2026-06-30',
            transactionCount: 0,
            total: 0,
            status: 'needs-review',
            payment: {
              transactionId: paymentId,
              value: -10,
              date: '2026-06-30',
            },
          },
          transactions: [],
        });
        const cashBills = await request(httpServer)
          .get(
            `/credit-card-bills?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-06-01&endDate=2026-06-30`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        const cashPayments = responseBody<
          Array<{ payment: { transactionId: string; value: number } | null }>
        >(cashBills).flatMap(({ payment }) => (payment ? [payment] : []));
        expect(cashPayments).toEqual([
          expect.objectContaining({ transactionId: paymentId, value: -10 }),
        ]);
        const cashTransactions = await request(httpServer)
          .get(
            `/transactions?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-06-01&endDate=2026-06-30`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(
          responseBody<{ data: unknown[] }>(cashTransactions).data,
        ).toEqual([]);
        const julyBills = await request(httpServer)
          .get(
            `/credit-card-bills?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-07-01&endDate=2026-07-31`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(
          responseBody<Array<{ billMonth: string }>>(julyBills).map(
            ({ billMonth }) => billMonth,
          ),
        ).not.toContain('2026-07');
        const monthlyBills = await request(httpServer)
          .get(
            `/credit-card-bills?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(
          responseBody<Array<{ total: number }>>(monthlyBills).reduce(
            (total, bill) => total + bill.total,
            0,
          ),
        ).toBe(0);
        const monthlyTransactions = await request(httpServer)
          .get(
            `/transactions?groupId=${groupId}&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(
          responseBody<{ data: unknown[] }>(monthlyTransactions).data,
        ).toEqual([]);
      }
    },
  );

  it('rejects transaction edits that bypass credit-card bill identity and reference-month assignment', async () => {
    const { groupId, creditAccountId, checkingAccountId, memberToken } =
      await reviewFixture();
    const created = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, creditAccountId, {
          billMonth: '2026-07',
        }),
      )
      .expect(201);
    const transactionId = responseBody<{ id: string }>(created).id;
    for (const mutation of [
      { creditDueDate: '2026-08-19' },
      { creditDueDate: null },
      { toBeConsideredAt: '2026-08-19' },
      { reviewMonth: '2026-05' },
      { bankaccountId: checkingAccountId },
      { bankaccountId: null },
    ]) {
      await request(httpServer)
        .patch(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(mutation)
        .expect(400);
    }
    const unchanged = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown>(unchanged)).toMatchObject({
      creditDueDate: '2026-07-05',
      toBeConsideredAt: '2026-07-05',
      reviewMonth: '2026-06',
    });
    await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        bankaccountId: creditAccountId,
        creditDueDate: '2026-07-05',
        toBeConsideredAt: '2026-07-05',
        description: 'Synthetic edited purchase',
      })
      .expect(200);

    const checking = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(reviewTransaction(groupId, checkingAccountId))
      .expect(201);
    const checkingId = responseBody<{ id: string }>(checking).id;
    for (const mutation of [
      { bankaccountId: creditAccountId },
      { bankaccountId: creditAccountId, creditDueDate: '2026-07-05' },
    ]) {
      await request(httpServer)
        .patch(`/transactions/${checkingId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(mutation)
        .expect(400);
    }
    const unchangedChecking = await request(httpServer)
      .get(`/transactions/${checkingId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown>(unchangedChecking)).toMatchObject({
      bankaccount: { id: checkingAccountId },
      creditDueDate: null,
      reviewMonth: '2026-06',
    });
  });

  it('preserves legacy timestamp output and month filters until the date is explicitly changed', async () => {
    const { groupId, checkingAccountId, memberToken } = await reviewFixture();
    const [{ id: transactionId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.transactions (group_id, bankaccount_id, description, date, calculated_date, value)
       VALUES ($1, $2, 'Synthetic legacy timestamp', '2026-06-30 21:00', '2026-06-30', -10) RETURNING id`,
      [groupId, checkingAccountId],
    );
    const legacyIsoDate = new Date(2026, 5, 30, 21).toISOString();
    const legacyReviewMonth = legacyIsoDate.slice(0, 7);
    const monthStart = `${legacyReviewMonth}-01`;
    const monthEnd = new Date(
      Date.UTC(
        Number(legacyReviewMonth.slice(0, 4)),
        Number(legacyReviewMonth.slice(5, 7)),
        0,
      ),
    )
      .toISOString()
      .slice(0, 10);
    const original = await request(httpServer)
      .get(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(responseBody<unknown>(original)).toMatchObject({
      date: legacyIsoDate,
      reviewMonth: legacyReviewMonth,
    });
    expect(responseBody<Record<string, unknown>>(original)).not.toHaveProperty(
      'dateIsUtc',
    );
    for (const dateBasis of ['monthly-review', 'cash-flow']) {
      const listing = await request(httpServer)
        .get(
          `/transactions?groupId=${groupId}&dateBasis=${dateBasis}&startDate=${monthStart}&endDate=${monthEnd}`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(
        responseBody<{ data: Array<{ id: string }> }>(listing).data,
      ).toEqual([expect.objectContaining({ id: transactionId })]);
    }
    const ordinaryEdit = await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ description: 'Synthetic legacy description edit' })
      .expect(200);
    expect(responseBody<unknown>(ordinaryEdit)).toMatchObject({
      date: legacyIsoDate,
      reviewMonth: legacyReviewMonth,
    });
    const [unchangedStoredDate] = await dataSource.query<
      Array<{ date: string; date_is_utc: boolean }>
    >('SELECT date::text, date_is_utc FROM public.transactions WHERE id = $1', [
      transactionId,
    ]);
    expect(unchangedStoredDate).toEqual({
      date: '2026-06-30 21:00:00',
      date_is_utc: false,
    });

    const explicitDateEdit = await request(httpServer)
      .patch(`/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ date: '2026-08-01' })
      .expect(200);
    expect(responseBody<unknown>(explicitDateEdit)).toMatchObject({
      date: '2026-08-01T00:00:00.000Z',
      reviewMonth: '2026-08',
      cashFlowDate: '2026-08-01',
    });
    const [canonicalStoredDate] = await dataSource.query<
      Array<{ date: string; date_is_utc: boolean }>
    >('SELECT date::text, date_is_utc FROM public.transactions WHERE id = $1', [
      transactionId,
    ]);
    expect(canonicalStoredDate).toEqual({
      date: '2026-08-01 00:00:00',
      date_is_utc: true,
    });
  });

  it.each(['value', 'bankaccountId'] as const)(
    'returns a reconciled bill to its forecast date when the payment %s is cleared',
    async (clearedField) => {
      const { groupId, creditAccountId, checkingAccountId, memberToken } =
        await reviewFixture();
      const purchase = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, creditAccountId, {
            billMonth: '2026-07',
          }),
        )
        .expect(201);
      const purchaseId = responseBody<{ id: string }>(purchase).id;
      const payment = await request(httpServer)
        .post('/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(
          reviewTransaction(groupId, checkingAccountId, { date: '2026-06-30' }),
        )
        .expect(201);
      const paymentId = responseBody<{ id: string }>(payment).id;
      const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
      await request(httpServer)
        .post(`${billPath}/reconciliation`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ groupId, paymentTransactionId: paymentId })
        .expect(200);
      await request(httpServer)
        .patch(`/transactions/${paymentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ [clearedField]: null })
        .expect(200);
      const changedBill = await request(httpServer)
        .get(`${billPath}?groupId=${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(responseBody<{ bill: unknown }>(changedBill).bill).toMatchObject({
        status: 'needs-review',
        payment: null,
        cashFlowDate: '2026-07-05',
        dueDate: '2026-07-05',
        total: -10,
      });
      const cashFlow = await request(httpServer)
        .get(
          `/transactions?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-07-01&endDate=2026-07-31`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(responseBody<{ data: unknown[] }>(cashFlow).data).toEqual([
        expect.objectContaining({
          id: purchaseId,
          cashFlowDate: '2026-07-05',
          cashFlowStatus: 'scheduled',
        }),
      ]);
      const oldPaymentMonth = await request(httpServer)
        .get(
          `/transactions?groupId=${groupId}&dateBasis=cash-flow&startDate=2026-06-01&endDate=2026-06-30`,
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(responseBody<{ data: unknown[] }>(oldPaymentMonth).data).toEqual(
        [],
      );
    },
  );

  it('rolls back a failed atomic write', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('CREATE TEMP TABLE harness_atomicity (id integer)');
    await queryRunner.startTransaction();
    await queryRunner.query('INSERT INTO harness_atomicity (id) VALUES (1)');
    await queryRunner.rollbackTransaction();

    const rows = (await queryRunner.query(
      'SELECT count(*)::integer AS count FROM harness_atomicity',
    )) as Array<{ count: number }>;
    await queryRunner.release();

    expect(rows[0]?.count).toBe(0);
  });

  function diagnoseUnexpectedFixtureUnauthorized(
    response: request.Response,
    token: string,
  ): void {
    if (response.status !== 401) return;
    let independentlyValid = false;
    let expired = false;
    let notYetValid = false;
    try {
      jwt.verify(token, testSecret, {
        algorithms: ['HS256'],
        audience: 'authenticated',
        issuer: `${testUrl}/auth/v1`,
      });
      independentlyValid = true;
    } catch (error) {
      expired = error instanceof jwt.TokenExpiredError;
      notYetValid = error instanceof jwt.NotBeforeError;
    }
    const configuration = app.get<ConfigService>(ConfigService);
    const message = responseBody<{ message?: unknown }>(response).message;
    // Diagnostics are flags only: no tokens, claims, secret values, customer
    // response fields, or internal verification errors enter failure output.
    throw new Error(
      `Unexpected fixture 401: tokenValid=${independentlyValid}, expired=${expired}, notYetValid=${notYetValid}, providerMatches=${configuration.get<string>('SUPABASE_URL') === testUrl}, verifierMatches=${configuration.get<string>('SUPABASE_JWT_SECRET') === testSecret}, missingHeader=${message === 'Missing Authorization header'}`,
    );
  }

  it('persists workspace custom values for all members, protects tenant boundaries, and cascades workspace deletion', async () => {
    const { groupId, otherGroupId, ownerToken, memberToken, outsiderToken } =
      await reviewFixture();
    const path = `/groups/${groupId}/custom-values`;
    await request(httpServer).get(path).expect(401);
    await request(httpServer)
      .get(path)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    const category = responseBody<{ id: string }>(
      await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ groupId, name: 'Shared costs' })
        .expect(201),
    );
    const create = (title: string, expression: string, token = memberToken) =>
      request(httpServer)
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .send({ title, expression });
    const first = responseBody<CustomValue>(
      await create('My custom tile', '{{Shared costs}} * 0.3').expect(201),
    );
    const second = responseBody<CustomValue>(
      await create('Combined', '{{My custom tile}} + 20', ownerToken).expect(
        201,
      ),
    );
    const read = async () =>
      responseBody<CustomValue[]>(
        await request(httpServer)
          .get(path)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200),
      );
    expect(
      evaluateCustomValues(await read(), { [category.id]: -100 })[second.id],
    ).toEqual({ value: -10 });
    await request(httpServer)
      .patch(`${path}/${first.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Renamed tile', expression: '{{Shared costs}} * 0.5' })
      .expect(200);
    expect(
      (await read()).find((tile) => tile.id === second.id)?.expression,
    ).toBe('{{Renamed tile}} + 20');
    expect(
      evaluateCustomValues(await read(), { [category.id]: -100 })[second.id],
    ).toEqual({ value: -30 });
    await create('my CUSTOM tile', '1').expect(201);
    await create('combined', '1').expect(409);
    await create('Shared costs', '1').expect(409);
    await request(httpServer)
      .post(path)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Bypass', expression: '1', groupId: otherGroupId })
      .expect(400);
    await request(httpServer)
      .post(path)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Bypass', expression: '1', userId: randomUUID() })
      .expect(400);
    await create('Foreign', '1', outsiderToken).expect(404);
    for (const target of [path, `/groups/9223372036854775807/custom-values`]) {
      const denied = responseBody<{ code: string; message: string }>(
        await request(httpServer)
          .get(target)
          .set('Authorization', `Bearer ${outsiderToken}`)
          .expect(404),
      );
      expect(denied).toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
      });
    }
    for (const method of ['patch', 'delete'] as const) {
      await request(httpServer)
        [method](`/groups/${otherGroupId}/custom-values/${first.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send(
          method === 'patch' ? { title: 'Foreign edit', expression: '1' } : {},
        )
        .expect(404);
      await request(httpServer)
        [method](`${path}/${first.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send(
          method === 'patch' ? { title: 'Foreign edit', expression: '1' } : {},
        )
        .expect(404);
    }
    await request(httpServer)
      .delete(`${path}/${first.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(409);
    await request(httpServer)
      .delete(`${path}/${second.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    await request(httpServer)
      .delete(`${path}/${first.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    await request(httpServer)
      .delete(`/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ confirmName: 'Monthly review fixture' })
      .expect(200);
    expect(
      await dataSource.query(
        'SELECT id FROM public.custom_values WHERE group_id = $1',
        [groupId],
      ),
    ).toEqual([]);
    const [privileges] = await dataSource.query<
      Array<{ read: boolean; write: boolean }>
    >(
      "SELECT has_table_privilege('anon','public.custom_values','SELECT') OR has_table_privilege('authenticated','public.custom_values','SELECT') AS read, has_table_privilege('authenticated','public.custom_values','INSERT') AS write",
    );
    expect(privileges).toEqual({ read: false, write: false });
  });

  it('rejects invalid formulas and cycles atomically, including concurrent workspace graph edits', async () => {
    const { groupId, otherGroupId, memberToken, outsiderToken } =
      await reviewFixture();
    const path = `/groups/${groupId}/custom-values`;
    const create = (title: string, expression: string) =>
      request(httpServer)
        .post(path)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title, expression });
    const foreign = responseBody<CustomValue>(
      await request(httpServer)
        .post(`/groups/${otherGroupId}/custom-values`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'Foreign tile', expression: '9' })
        .expect(201),
    );
    for (const expression of [
      '1 +',
      'Math.random()',
      '{{Unknown}}',
      `{{tile:${foreign.id}}}`,
    ])
      await create('Invalid', expression).expect(400);
    const a = responseBody<CustomValue>(await create('A', '10').expect(201));
    const b = responseBody<CustomValue>(await create('B', '20').expect(201));
    const edit = (id: string, title: string, expression: string) =>
      request(httpServer)
        .patch(`${path}/${id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title, expression });
    await edit(a.id, 'A', '{{A}}').expect(400);
    const attempts = await Promise.all([
      edit(a.id, 'A', '{{B}}'),
      edit(b.id, 'B', '{{A}}'),
    ]);
    expect(attempts.map((result) => result.status).sort()).toEqual([200, 400]);
    const tiles = responseBody<CustomValue[]>(
      await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(
      Object.values(evaluateCustomValues(tiles, {})).every(
        (result) => result.error === undefined,
      ),
    ).toBe(true);
    await create('Zero divisor', '1/(2-2)').expect(201);
    const stored = responseBody<CustomValue[]>(
      await request(httpServer)
        .get(path)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200),
    );
    expect(
      evaluateCustomValues(stored, {})[
        stored.find((tile) => tile.title === 'Zero divisor')!.id
      ],
    ).toEqual({ error: 'Cannot divide by zero.' });
    expect(stored).toHaveLength(3);
  });

  function tokenFor(userId: string, email: string): string {
    return jwt.sign({ sub: userId, email, role: 'authenticated' }, testSecret, {
      expiresIn: '5m',
      audience: 'authenticated',
      issuer: `${testUrl}/auth/v1`,
    });
  }

  async function reviewFixture() {
    const [ownerId, memberId, outsiderId] = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ];
    await dataSource.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ($1::uuid, $1::text || '@example.com', '{}'::jsonb), ($2::uuid, $2::text || '@example.com', '{}'::jsonb), ($3::uuid, $3::text || '@example.com', '{}'::jsonb)`,
      [ownerId, memberId, outsiderId],
    );
    const [group, otherGroup] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.groups (name) VALUES ('Monthly review fixture'), ('Other review fixture') RETURNING id`,
    );
    const groupId = group.id;
    const otherGroupId = otherGroup.id;
    await dataSource.query(
      `INSERT INTO public.user_group (group_id, user_id, role) VALUES ($1, $2, 'owner'), ($1, $3, 'member'), ($4, $5, 'owner')`,
      [groupId, ownerId, memberId, otherGroupId, outsiderId],
    );
    const [credit, checking, otherCredit] = await dataSource.query<
      Array<{ id: string }>
    >(
      `INSERT INTO public.bankaccounts (created_at, name, type, due_date, group_id, user_id) VALUES
      ('2025-01-01', 'Review card', 'credit', 5, $1, $2),
      ('2025-01-01', 'Review checking', 'checkout', NULL, $1, $2),
      ('2025-01-01', 'Foreign card', 'credit', 5, $3, $4) RETURNING id`,
      [groupId, ownerId, otherGroupId, outsiderId],
    );
    return {
      groupId,
      otherGroupId,
      creditAccountId: credit.id,
      checkingAccountId: checking.id,
      otherCreditAccountId: otherCredit.id,
      ownerToken: tokenFor(ownerId, `${ownerId}@example.com`),
      memberToken: tokenFor(memberId, `${memberId}@example.com`),
      outsiderToken: tokenFor(outsiderId, `${outsiderId}@example.com`),
    };
  }

  function reviewTransaction(
    groupId: string,
    bankaccountId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      groupId,
      bankaccountId,
      categoryId: null,
      billMonth: null,
      date: '2026-06-18',
      description: 'Synthetic review transaction',
      value: -10,
      installmentCurrent: null,
      installmentTotal: null,
      observation: null,
      ...overrides,
    };
  }

  async function seedObsoleteReviewMetadata(legacyGroupId: string) {
    await dataSource.query(
      'UPDATE public.groups SET credit_card_review_month_offset = -1 WHERE id = $1',
      [legacyGroupId],
    );
    await dataSource.query(
      "UPDATE public.credit_card_bill_reviews SET review_month = '2024-03-01' WHERE group_id = $1",
      [legacyGroupId],
    );
    await dataSource.query(
      "UPDATE public.transactions SET review_month = '2023-05-01' WHERE group_id = $1",
      [legacyGroupId],
    );
    const [{ user_id: userId }] = await dataSource.query<
      Array<{ user_id: string }>
    >(
      "SELECT id, user_id FROM public.bankaccounts WHERE group_id = $1 AND type = 'credit'",
      [legacyGroupId],
    );
    const [{ id: groupId }] = await dataSource.query<Array<{ id: string }>>(
      "INSERT INTO public.groups (name, credit_card_review_month_offset) VALUES ('Synthetic review migration', -1) RETURNING id",
    );
    const [{ id: creditAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      "INSERT INTO public.bankaccounts (name, type, due_date, group_id, user_id) VALUES ('Synthetic migration credit', 'credit', 5, $1, $2) RETURNING id",
      [groupId, userId],
    );
    await dataSource.query(
      "INSERT INTO public.credit_card_bill_reviews (group_id, credit_account_id, bill_month, review_month) VALUES ($1, $2, '2026-07-01', '2024-03-01')",
      [groupId, creditAccountId],
    );
    const [{ id: checkingAccountId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      "INSERT INTO public.bankaccounts (name, type, group_id, user_id) VALUES ('Synthetic migration checking', 'checkout', $1, $2) RETURNING id",
      [groupId, userId],
    );
    const [{ id: cardId }] = await dataSource.query<Array<{ id: string }>>(
      "INSERT INTO public.credit_cards (name, last4, group_id, account_id, archived) VALUES ('Synthetic archived card', '0042', $1, $2, true) RETURNING id",
      [groupId, creditAccountId],
    );
    const [{ id: activeCardId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      "INSERT INTO public.credit_cards (name, last4, group_id, account_id) VALUES ('Synthetic active card', '0001', $1, $2) RETURNING id",
      [groupId, creditAccountId],
    );
    await dataSource.query(
      `
      INSERT INTO public.transactions (group_id, bankaccount_id, credit_card_id, description, value, removed)
      VALUES ($1, $2, $3, 'Synthetic active attribution', -1, false),
        ($1, $2, $3, 'Synthetic deleted attribution', -2, true)
    `,
      [groupId, creditAccountId, activeCardId],
    );
    const content = Buffer.from(
      'Date;Description;Amount\n20/06/2026;Synthetic migration purchase;-10',
    );
    const payload = importPayload({
      groupId,
      accountId: creditAccountId,
      billMonth: '2026-07',
      fileContent: content,
    });
    await dataSource.query(
      `
      INSERT INTO public.import_profiles (group_id, account_id, source_fingerprint, config_version, mapping_config)
      VALUES ($1, $2, $3, 1, $4)
    `,
      [
        groupId,
        creditAccountId,
        payload.sourceFingerprint,
        {
          ...payload.config,
          creditCardColumn: 3,
          creditCardMappings: [{ value: 'Mine', creditCardId: cardId }],
        },
      ],
    );
    const [{ id: importId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.imports ("fileName", group_id, account_id, file_hash, file_size,
        source_fingerprint, config_version, mapping_config, transaction_count, excluded_row_count,
        inflow_total, outflow_total, bill_due_date)
       VALUES ('synthetic-migration.csv', $1, $2, $3, $4, $5, 1, $6, 1, 0, 0, 10, '2026-07-05') RETURNING id`,
      [
        groupId,
        creditAccountId,
        payload.fileHash,
        content.length,
        payload.sourceFingerprint,
        payload.config,
      ],
    );
    await dataSource.query(
      'INSERT INTO public.import_files (import_id, content) VALUES ($1, $2)',
      [importId, content],
    );
    await dataSource.query(
      `INSERT INTO public.transactions (group_id, bankaccount_id, credit_card_id, import_id, source_row,
        description, value, date, date_is_utc, credit_due_date, review_month, removed)
       VALUES ($1, $2, $3, $4, 2, 'Synthetic migration purchase', -10, '2026-06-20', true, '2026-07-05', '2024-03-01', false)`,
      [groupId, creditAccountId, cardId, importId],
    );
    const [{ id: paymentId }] = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO public.transactions (group_id, bankaccount_id, description, value, date, date_is_utc,
        calculated_date, review_month) VALUES ($1, $2, 'Synthetic migration payment', -10, '2026-07-04',
        true, '2026-07-04', '2022-10-01') RETURNING id`,
      [groupId, checkingAccountId],
    );
    await dataSource.query(
      `INSERT INTO public.credit_card_bill_reconciliations (group_id, credit_account_id, bill_month,
        payment_transaction_id, reconciled_bill_total) VALUES ($1, $2, '2026-07-01', $3, -10)`,
      [groupId, creditAccountId, paymentId],
    );
  }

  async function cardBackfillFixture(
    kind: 'credit' | 'checking' | 'foreign' = 'credit',
  ) {
    const fixture = await reviewFixture();
    const groupId = kind === 'foreign' ? fixture.otherGroupId : fixture.groupId;
    const accountId =
      kind === 'foreign'
        ? fixture.otherCreditAccountId
        : kind === 'checking'
          ? fixture.checkingAccountId
          : fixture.creditAccountId;
    const token =
      kind === 'foreign' ? fixture.outsiderToken : fixture.memberToken;
    const content = Buffer.from(
      [
        '\uFEFFDate;Nome no Cartão;Final do Cartão;Description;Amount',
        `2026-06-18;${kind === 'foreign' ? 'Foreign' : 'Personal'};**** 0042;"Synthetic;\nmultiline";-10`,
        '2026-06-18;Personal;0042;Synthetic manual;-10',
        '2026-06-18;Shared;0099;Synthetic partial;-10',
        '2026-06-18;;;Synthetic blank;-10',
        '2026-06-18;Removed;0011;Synthetic removed;-10',
        '2026-06-18;Name only;;Synthetic name;-10',
        '2026-06-18;Excluded;0022;Synthetic excluded;-10',
      ].join('\r\n'),
    );
    const payload = importPayload({
      groupId,
      accountId,
      fileContent: content,
      billMonth: kind === 'checking' ? null : '2026-07',
      rows: [2, 4, 5, 6, 7, 8].map((sourceRow) => ({
        sourceRow,
        date: '2026-06-18',
        amount: -10,
        description: 'Synthetic retained card transaction',
        installmentCurrent: null,
        installmentTotal: null,
      })),
    });
    payload.config.descriptionColumns = [3];
    payload.config.amountColumn = 4;
    payload.config.numberFormat = 'decimal-point';
    payload.excludedRowCount = 1;
    const response = await postImport(token, payload, content).expect(201);
    return {
      groupId,
      importId: responseBody<{ id: string }>(response).id,
      content,
    };
  }

  async function cardBackfillSnapshot(
    runner: ReturnType<DataSource['createQueryRunner']>,
    omitCard = false,
  ) {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of [
      'transactions',
      'imports',
      'import_files',
      'import_profiles',
      'credit_card_bill_reconciliations',
    ]) {
      const omit =
        table === 'transactions' && omitCard
          ? " - 'card_name' - 'card_last4'"
          : '';
      const key = table === 'import_files' ? 'import_id' : 'id';
      snapshot[table] = await runner.manager.query<Array<{ data: unknown }>>(
        `SELECT to_jsonb(record)${omit} AS data FROM public.${table} record ORDER BY ${key}`,
      );
    }
    return snapshot;
  }

  async function financialMigrationSnapshot(): Promise<
    Record<string, unknown[]>
  > {
    const snapshot: Record<string, unknown[]> = {};
    // Identifiers are a fixed test allowlist, never request/customer input.
    for (const table of [
      'groups',
      'bankaccounts',
      'transactions',
      'credit_cards',
      'credit_card_bill_reconciliations',
      'imports',
      'import_files',
    ]) {
      const omit =
        table === 'groups'
          ? " - 'credit_card_review_month_offset'"
          : table === 'transactions'
            ? " - 'review_month'"
            : '';
      const key = table === 'import_files' ? 'import_id' : 'id';
      snapshot[table] = await dataSource.query<Array<{ data: unknown }>>(
        `SELECT to_jsonb(record)${omit} AS data FROM public.${table} record ORDER BY ${key}`,
      );
    }
    return snapshot;
  }

  function importPayload({
    groupId,
    accountId,
    fileName = 'synthetic.csv',
    fileContent,
    sourceFingerprint = 'b'.repeat(64),
    billMonth = null,
    rows,
  }: {
    groupId: string;
    accountId: string;
    fileName?: string;
    fileContent: Buffer;
    sourceFingerprint?: string;
    billMonth?: string | null;
    rows?: Array<Record<string, unknown>>;
  }) {
    return {
      groupId,
      accountId,
      billMonth,
      fileName,
      fileSize: fileContent.length,
      fileHash: createHash('sha256').update(fileContent).digest('hex'),
      sourceFingerprint,
      excludedRowCount: 0,
      config: {
        version: 1,
        delimiter: ';',
        encoding: 'utf-8',
        hasHeader: true,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'decimal-comma',
        dateColumn: 0,
        descriptionColumns: [1],
        installmentColumn: null,
        amountMode: 'signed',
        amountColumn: 2,
        debitColumn: null,
        creditColumn: null,
        chargesPositive: false,
      },
      rows: rows ?? [
        {
          sourceRow: 7,
          date: '2026-09-21',
          amount: 5,
          description: 'Synthetic imported row',
          installmentCurrent: null,
          installmentTotal: null,
        },
      ],
    };
  }

  function postImport(
    token: string,
    payload: ReturnType<typeof importPayload>,
    fileContent: Buffer,
  ) {
    return request(httpServer)
      .post('/imports')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify(payload))
      .attach('file', fileContent, {
        filename: payload.fileName,
        contentType: 'text/csv',
      });
  }

  function responseBody<T>(response: request.Response): T {
    return response.body as unknown as T;
  }
});
