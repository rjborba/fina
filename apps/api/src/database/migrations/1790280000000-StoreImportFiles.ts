import { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreImportFiles1790280000000 implements MigrationInterface {
  name = 'StoreImportFiles1790280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.import_files (
        import_id bigint PRIMARY KEY REFERENCES public.imports(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        content bytea NOT NULL,
        CONSTRAINT import_files_content_size_check
          CHECK (octet_length(content) BETWEEN 1 AND 5242880)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE public.import_files DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL PRIVILEGES ON public.import_files
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.import_files');
  }
}
