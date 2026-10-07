import { ImportMappingConfigSchema } from '@fina/types';
import { createHash } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { readImportSourceAmounts } from '../../common/import-source-amounts-v1';

type RetainedImport = {
  id: string;
  group_id: string;
  mapping_config: unknown;
  file_hash: string;
  file_size: string;
};

export class CorrectImportedAmountSigns1791100000000
  implements MigrationInterface
{
  name = 'CorrectImportedAmountSigns1791100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const imports = await queryRunner.manager.query<RetainedImport[]>(`
      SELECT id, group_id, mapping_config, file_hash, file_size
      FROM public.imports
      WHERE mapping_config->>'amountMode' = 'signed'
        AND mapping_config->>'chargesPositive' = 'true'
      ORDER BY id
      FOR UPDATE
    `);
    for (const record of imports) {
      const parsedConfig = ImportMappingConfigSchema.safeParse(
        record.mapping_config,
      );
      if (!parsedConfig.success) {
        throw new Error(
          'Cannot correct import signs without a valid saved mapping',
        );
      }
      const [file] = await queryRunner.manager.query<{ content: Buffer }[]>(
        'SELECT content FROM public.import_files WHERE import_id = $1',
        [record.id],
      );
      if (
        !file ||
        file.content.length !== Number(record.file_size) ||
        createHash('sha256').update(file.content).digest('hex') !==
          record.file_hash.trim()
      ) {
        throw new Error(
          'Cannot correct import signs without a verified retained CSV',
        );
      }
      const amounts = readImportSourceAmounts(file.content, parsedConfig.data);
      const transactions = await queryRunner.manager.query<
        { id: string; source_row: number | null }[]
      >(
        `SELECT id, source_row FROM public.transactions
         WHERE import_id = $1 AND group_id = $2
         ORDER BY id FOR UPDATE`,
        [record.id, record.group_id],
      );
      let inflowTotal = 0;
      let outflowTotal = 0;
      for (const transaction of transactions) {
        const raw =
          transaction.source_row === null
            ? undefined
            : amounts.get(transaction.source_row);
        if (raw === undefined) {
          throw new Error(
            'Cannot correct an import with an unverifiable source row',
          );
        }
        const corrected = raw === 0 ? 0 : -raw;
        if (corrected > 0) inflowTotal += corrected;
        else if (corrected < 0) outflowTotal += corrected;
        if (raw >= 0) continue;
        // Match the original float4 storage, not a rounded JavaScript rendering.
        // Already-correct values and manually changed magnitudes remain intact.
        await queryRunner.query(
          `UPDATE public.transactions SET value = $1
           WHERE id = $2 AND import_id = $3 AND group_id = $4
             AND value = $5::real AND value < 0`,
          [
            corrected,
            transaction.id,
            record.id,
            record.group_id,
            -Math.abs(raw),
          ],
        );
      }
      // These fields describe the original import, including soft-deleted rows,
      // rather than subsequent manual changes to individual transactions.
      await queryRunner.query(
        `UPDATE public.imports SET inflow_total = $1, outflow_total = $2
         WHERE id = $3 AND group_id = $4`,
        [
          Math.round(inflowTotal * 100) / 100,
          Math.round(outflowTotal * 100) / 100,
          record.id,
          record.group_id,
        ],
      );
    }
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'This source-backed data correction is forward-only; reverting would restore incorrect financial values',
      ),
    );
  }
}
