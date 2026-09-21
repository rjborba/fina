import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

describe('PostgreSQL integration harness', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let dataSource: DataSource;

  beforeAll(async () => {
    let databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) {
      container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('fina_test')
        .withUsername('fina_test')
        .withPassword('fina_test')
        .start();
      databaseUrl = container.getConnectionUri();
    }

    const databaseName = new URL(databaseUrl).pathname.slice(1);
    if (!databaseName.toLowerCase().includes('test')) {
      throw new Error(
        'Integration tests require a database name containing "test"',
      );
    }

    dataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await dataSource.initialize();
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
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
});
