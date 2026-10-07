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
];

describe('backend-only PostgreSQL boundary', () => {
  const testSecret = 'local-integration-jwt-secret';
  const testUrl = 'https://fina-integration.supabase.co';
  let dataSource: DataSource;
  let app: INestApplication;
  let httpServer: Server;

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
      'credit_card_bill_reviews',
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
    expect(migrationCount[0]?.count).toBe(15);

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

  it('backfills review months without shifting history and constrains the new tenant metadata', async () => {
    const migratedBills = await dataSource.query<
      Array<{ bill_month: string; review_month: string; offset: number }>
    >(`
      SELECT review.bill_month::text, review.review_month::text,
        group_record.credit_card_review_month_offset AS offset
      FROM public.credit_card_bill_reviews review
      JOIN public.groups group_record ON group_record.id = review.group_id
      WHERE group_record.name = 'Legacy due day'
      ORDER BY review.bill_month
    `);
    expect(migratedBills).toEqual([
      { bill_month: '2026-01-01', review_month: '2026-01-01', offset: 0 },
      { bill_month: '2026-07-01', review_month: '2026-07-01', offset: 0 },
    ]);
    const legacyDates = await dataSource.query<
      Array<{ date: string; date_is_utc: boolean }>
    >(`
      SELECT transaction_record.date::date::text AS date, transaction_record.date_is_utc
      FROM public.transactions transaction_record
      JOIN public.groups group_record ON group_record.id = transaction_record.group_id
      WHERE group_record.name = 'Legacy due day' ORDER BY transaction_record.date
    `);
    expect(legacyDates).toEqual([
      { date: '2025-12-12', date_is_utc: false },
      { date: '2026-06-18', date_is_utc: false },
      { date: '2026-07-01', date_is_utc: false },
    ]);

    const fixture = await reviewFixture();
    await expect(
      dataSource.query(
        `UPDATE public.groups SET credit_card_review_month_offset = 1 WHERE id = $1`,
        [fixture.groupId],
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        `INSERT INTO public.credit_card_bill_reviews
           (group_id, credit_account_id, bill_month, review_month)
         VALUES ($1, $2, '2026-07-02', '2026-06-01')`,
        [fixture.groupId, fixture.creditAccountId],
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        `INSERT INTO public.transactions (group_id, review_month)
         VALUES ($1, '2026-06-02')`,
        [fixture.groupId],
      ),
    ).rejects.toThrow();
    await dataSource.query(
      `INSERT INTO public.credit_card_bill_reviews
         (group_id, credit_account_id, bill_month, review_month)
       VALUES ($1, $2, '2026-07-01', '2026-06-01')`,
      [fixture.groupId, fixture.creditAccountId],
    );
    await expect(
      dataSource.query(
        `INSERT INTO public.credit_card_bill_reviews
           (group_id, credit_account_id, bill_month, review_month)
         VALUES ($1, $2, '2026-07-01', '2026-05-01')`,
        [fixture.groupId, fixture.creditAccountId],
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        `INSERT INTO public.credit_card_bill_reviews
           (group_id, credit_account_id, bill_month, review_month)
         VALUES ($1, $2, '2026-07-01', '2026-06-02')`,
        [fixture.groupId, fixture.creditAccountId],
      ),
    ).rejects.toThrow();
    await expect(
      dataSource.query(
        `INSERT INTO public.credit_card_bill_reviews
           (group_id, credit_account_id, bill_month, review_month)
         VALUES ($1, $2, '2026-07-01', '2026-06-01')`,
        [fixture.groupId, fixture.otherCreditAccountId],
      ),
    ).rejects.toThrow();
    const indexes = await dataSource.query<Array<{ indexname: string }>>(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname IN (
        'credit_card_bill_reviews_group_month_idx',
        'transactions_group_review_month_idx'
      ) ORDER BY indexname
    `);
    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      'credit_card_bill_reviews_group_month_idx',
      'transactions_group_review_month_idx',
    ]);
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
    await dataSource.query(
      `INSERT INTO public.credit_card_bill_reviews (
         group_id, credit_account_id, bill_month, review_month
       ) VALUES ($1, $2, '2026-01-01', '2025-12-01')`,
      [groupId, creditAccountId],
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
         UNION ALL SELECT group_id FROM public.credit_card_bill_reviews
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
      `UPDATE public.transactions SET value = -8, review_month = '2026-05-01',
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

  it('keeps bill review months independent from purchases, cash flow, payments, and later defaults', async () => {
    const fixture = await reviewFixture();
    const {
      groupId,
      creditAccountId,
      checkingAccountId,
      ownerToken,
      memberToken,
    } = fixture;
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
      expect(purchase.reviewMonth).toBe('2026-07');
    }

    await request(httpServer)
      .patch(`/groups/${groupId}/review-settings`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(200);
    const unchanged = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ bill: { reviewMonth: string } }>(unchanged).bill
        .reviewMonth,
    ).toBe('2026-07');

    const changed = await request(httpServer)
      .patch(`${billPath}/review-month`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, reviewMonth: '2026-06' })
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
    const conflictingPurchase = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, creditAccountId, {
          billMonth: '2026-07',
          reviewMonth: '2026-07',
        }),
      )
      .expect(409);
    expect(responseBody<{ code: string }>(conflictingPurchase).code).toBe(
      'BILL_REVIEW_MONTH_CONFLICT',
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

  it('authorizes review settings and bill edits without tenant disclosure and supports bank overrides', async () => {
    const fixture = await reviewFixture();
    const {
      groupId,
      otherGroupId,
      creditAccountId,
      otherCreditAccountId,
      checkingAccountId,
      ownerToken,
      memberToken,
      outsiderToken,
    } = fixture;
    const settingsPath = `/groups/${groupId}/review-settings`;
    const billPath = `/credit-card-bills/${creditAccountId}/2026-07/review-month`;
    await request(httpServer)
      .patch(settingsPath)
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(401);
    await request(httpServer)
      .patch(billPath)
      .send({ groupId, reviewMonth: '2026-06' })
      .expect(401);
    await request(httpServer)
      .patch(settingsPath)
      .set('Authorization', 'Bearer invalid')
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(401);
    await request(httpServer)
      .patch(settingsPath)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(403);
    await request(httpServer)
      .patch(settingsPath)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ creditCardReviewMonthOffset: 1 })
      .expect(400);
    const denied = await request(httpServer)
      .patch(settingsPath)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(404);
    const missing = await request(httpServer)
      .patch('/groups/999999999/review-settings')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ creditCardReviewMonthOffset: -1 })
      .expect(404);
    const stableError = (response: request.Response) => {
      const { code, message, requestId } = responseBody<{
        code: string;
        message: string;
        requestId: string;
      }>(response);
      expect(requestId).toEqual(expect.any(String));
      return { code, message };
    };
    expect(stableError(denied)).toEqual(stableError(missing));

    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, creditAccountId, { billMonth: '2026-07' }),
      )
      .expect(201);
    const foreignBill = await request(httpServer)
      .patch(billPath)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ groupId, reviewMonth: '2026-06' })
      .expect(404);
    const unknownBill = await request(httpServer)
      .patch('/credit-card-bills/999999999/2026-07/review-month')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ groupId, reviewMonth: '2026-06' })
      .expect(404);
    expect(stableError(foreignBill)).toEqual(stableError(unknownBill));
    await request(httpServer)
      .patch(billPath)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId: otherGroupId, reviewMonth: '2026-06' })
      .expect(404);
    await request(httpServer)
      .patch(`/credit-card-bills/${otherCreditAccountId}/2026-07/review-month`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, reviewMonth: '2026-06' })
      .expect(404);
    await request(httpServer)
      .patch(billPath)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, reviewMonth: '2026-13' })
      .expect(400);
    await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, otherCreditAccountId, {
          billMonth: '2026-07',
          reviewMonth: '2026-06',
        }),
      )
      .expect(404);

    const bankResponse = await request(httpServer)
      .post('/transactions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(
        reviewTransaction(groupId, checkingAccountId, { date: '2026-07-01' }),
      )
      .expect(201);
    const bankTransaction = responseBody<{ id: string; reviewMonth: string }>(
      bankResponse,
    );
    expect(bankTransaction.reviewMonth).toBe('2026-07');
    const initialBankReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&accountType=checkout&dateBasis=monthly-review&startDate=2026-07-01&endDate=2026-07-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(initialBankReview).data,
    ).toEqual([expect.objectContaining({ id: bankTransaction.id })]);
    const override = await request(httpServer)
      .patch(`/transactions/${bankTransaction.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reviewMonth: '2026-06' })
      .expect(200);
    expect(responseBody<{ reviewMonth: string }>(override).reviewMonth).toBe(
      '2026-06',
    );
    await request(httpServer)
      .patch(`/transactions/${bankTransaction.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ reviewMonth: '2026-05' })
      .expect(404);
    const checkingReview = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&accountType=checkout&dateBasis=monthly-review&startDate=2026-06-01&endDate=2026-06-30`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(checkingReview).data,
    ).toEqual([expect.objectContaining({ id: bankTransaction.id })]);
    const checkingCashFlow = await request(httpServer)
      .get(
        `/transactions?groupId=${groupId}&accountType=checkout&dateBasis=cash-flow&startDate=2026-07-01&endDate=2026-07-31`,
      )
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{ data: Array<{ id: string }> }>(checkingCashFlow).data,
    ).toEqual([expect.objectContaining({ id: bankTransaction.id })]);
    const movedDate = await request(httpServer)
      .patch(`/transactions/${bankTransaction.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ date: '2026-08-09' })
      .expect(200);
    expect(
      responseBody<{ reviewMonth: string; cashFlowDate: string }>(movedDate),
    ).toMatchObject({ reviewMonth: '2026-06', cashFlowDate: '2026-08-09' });
    const [{ persisted_date: persistedDate }] = await dataSource.query<
      Array<{ persisted_date: string }>
    >(
      'SELECT date::date::text AS persisted_date FROM public.transactions WHERE id = $1',
      [bankTransaction.id],
    );
    expect(persistedDate).toBe('2026-08-09');
  });

  it('persists bill review assignment atomically across imports, conflicts, reimports, and concurrent writers', async () => {
    const { groupId, creditAccountId, memberToken } = await reviewFixture();
    const content = Buffer.from(
      'Date;Description;Amount\n2026-06-18;Synthetic review import;10',
    );
    const payload = importPayload({
      groupId,
      accountId: creditAccountId,
      billMonth: '2026-07',
      reviewMonth: '2026-06',
      fileContent: content,
    });
    const initial = await postImport(memberToken, payload, content).expect(201);
    const initialImportId = responseBody<{ id: string }>(initial).id;
    const billPath = `/credit-card-bills/${creditAccountId}/2026-07`;
    await request(httpServer)
      .patch(`${billPath}/review-month`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ groupId, reviewMonth: '2026-05' })
      .expect(200);
    const conflictContent = Buffer.from(
      'Date;Description;Amount\n2026-06-19;Synthetic conflicting import;10',
    );
    const conflictPayload = importPayload({
      groupId,
      accountId: creditAccountId,
      billMonth: '2026-07',
      reviewMonth: '2026-06',
      fileContent: conflictContent,
    });
    const conflict = await postImport(
      memberToken,
      conflictPayload,
      conflictContent,
    ).expect(409);
    expect(responseBody<{ code: string }>(conflict).code).toBe(
      'BILL_REVIEW_MONTH_CONFLICT',
    );
    const [{ count: conflictingImports }] = await dataSource.query<
      Array<{ count: number }>
    >(
      'SELECT count(*)::integer AS count FROM public.imports WHERE group_id = $1 AND file_hash = $2',
      [groupId, conflictPayload.fileHash],
    );
    expect(conflictingImports).toBe(0);
    await request(httpServer)
      .delete(`/imports/${initialImportId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const reimportPayload = { ...payload, reviewMonth: undefined };
    await postImport(memberToken, reimportPayload, content).expect(201);
    const retainedMonth = await request(httpServer)
      .get(`${billPath}?groupId=${groupId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(
      responseBody<{
        bill: { reviewMonth: string };
        transactions: Array<{ reviewMonth: string }>;
      }>(retainedMonth),
    ).toMatchObject({
      bill: { reviewMonth: '2026-05' },
      transactions: [expect.objectContaining({ reviewMonth: '2026-05' })],
    });

    await dataSource.query(`
      CREATE FUNCTION public.fail_review_import_row() RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        IF NEW.source_row = 998 THEN RAISE EXCEPTION 'synthetic review persistence failure'; END IF;
        RETURN NEW;
      END;
      $function$;
      CREATE TRIGGER fail_review_import_row BEFORE INSERT ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.fail_review_import_row();
    `);
    const rollbackContent = Buffer.from(
      'Date;Description;Amount\n2026-10-01;Synthetic review rollback;10',
    );
    const rollbackPayload = importPayload({
      groupId,
      accountId: creditAccountId,
      billMonth: '2026-11',
      reviewMonth: '2026-10',
      fileContent: rollbackContent,
      rows: [
        {
          sourceRow: 998,
          date: '2026-10-01',
          amount: 10,
          description: 'Synthetic review rollback',
          installmentCurrent: null,
          installmentTotal: null,
        },
      ],
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    try {
      await postImport(memberToken, rollbackPayload, rollbackContent).expect(
        500,
      );
    } finally {
      consoleSpy.mockRestore();
      await dataSource.query(
        'DROP TRIGGER fail_review_import_row ON public.transactions',
      );
      await dataSource.query('DROP FUNCTION public.fail_review_import_row()');
    }
    const [{ count: rollbackRows }] = await dataSource.query<
      Array<{ count: number }>
    >(
      `SELECT count(*)::integer AS count FROM (
      SELECT group_id FROM public.credit_card_bill_reviews WHERE bill_month = '2026-11-01'
      UNION ALL SELECT group_id FROM public.imports WHERE file_hash = $2
    ) rows WHERE group_id = $1`,
      [groupId, rollbackPayload.fileHash],
    );
    expect(rollbackRows).toBe(0);

    const raceResults = await Promise.all(
      ['2027-01', '2027-02'].map((reviewMonth) => {
        const fileContent = Buffer.from(
          `Date;Description;Amount\n2027-02-01;Synthetic concurrent ${reviewMonth};10`,
        );
        return postImport(
          memberToken,
          importPayload({
            groupId,
            accountId: creditAccountId,
            billMonth: '2027-03',
            reviewMonth,
            fileContent,
          }),
          fileContent,
        );
      }),
    );
    expect(raceResults.map(({ status }) => status).sort()).toEqual([201, 409]);
    const winningMonth = await dataSource.query<
      Array<{ review_month: string; import_count: number }>
    >(
      `
      SELECT review.review_month::text, (
        SELECT count(*)::integer FROM public.imports WHERE group_id = $1 AND bill_due_date = '2027-03-05'
      ) AS import_count FROM public.credit_card_bill_reviews review
      WHERE group_id = $1 AND credit_account_id = $2 AND bill_month = '2027-03-01'
    `,
      [groupId, creditAccountId],
    );
    expect(winningMonth).toHaveLength(1);
    expect(winningMonth[0]?.review_month).toMatch(/^2027-0[12]-01$/);
    expect(winningMonth[0]?.import_count).toBe(1);
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
        reviewMonth: '2026-06',
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
          reviewMonth: '2026-06',
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
            reviewMonth: '2026-06',
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

  function importPayload({
    groupId,
    accountId,
    fileName = 'synthetic.csv',
    fileContent,
    sourceFingerprint = 'b'.repeat(64),
    billMonth = null,
    reviewMonth,
    rows,
  }: {
    groupId: string;
    accountId: string;
    fileName?: string;
    fileContent: Buffer;
    sourceFingerprint?: string;
    billMonth?: string | null;
    reviewMonth?: string;
    rows?: Array<Record<string, unknown>>;
  }) {
    return {
      groupId,
      accountId,
      billMonth,
      ...(reviewMonth === undefined ? {} : { reviewMonth }),
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
