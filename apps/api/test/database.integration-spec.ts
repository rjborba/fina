import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { Server } from 'node:http';
import { createHash } from 'node:crypto';
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
      migrations: [
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
      ],
    });
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
    expect(migrationCount[0]?.count).toBe(13);

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
    expect(inlinePayment).toMatchObject({
      id: paymentTransaction.id,
      billPayment: {
        creditAccountId,
        billMonth: '2026-10',
      },
    });

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
