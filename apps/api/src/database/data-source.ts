import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ path: process.env.DOTENV_CONFIG_PATH ?? '.env' });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URI;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database migrations');
}

const ssl = process.env.DATABASE_SSL;

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  schema: process.env.DATABASE_SCHEMA ?? 'public',
  ...(ssl === undefined
    ? {}
    : { ssl: ssl === 'true' ? { rejectUnauthorized: true } : false }),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});
