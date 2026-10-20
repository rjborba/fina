import { createHash } from 'node:crypto';
import {
  CardNameSchema,
  ImportCardLast4CellSchema,
  ImportMappingConfigSchema,
} from '@fina/types';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { readImportSourceColumn } from '../../common/import-source-column-v1';

type CardUpdate = {
  id: string;
  import_id: string;
  group_id: string;
  account_id: string;
  old_name: string | null;
  old_last4: string | null;
  card_name: string | null;
  card_last4: string | null;
};

export class BackfillImportedCardMetadata1792501867419
  implements MigrationInterface
{
  name = 'BackfillImportedCardMetadata1792501867419';

  // This frozen repair recognizes the verified historical statement layout.
  // Never infer cards from descriptions, amounts, row order, or another import.
  async plan(queryRunner: QueryRunner) {
    const imports = await queryRunner.manager.query<
      Array<{
        id: string;
        group_id: string;
        account_id: string;
        mapping_config: unknown;
        file_hash: string;
        file_size: string;
        content: Buffer | null;
      }>
    >(`
      SELECT i.id, i.group_id, i.account_id, i.mapping_config,
        i.file_hash, i.file_size, source.content
      FROM public.imports i
      JOIN public.bankaccounts account
        ON account.id = i.account_id AND account.group_id = i.group_id
      LEFT JOIN public.import_files source ON source.import_id = i.id
      WHERE account.type = 'credit' AND i.removed IS NOT TRUE
        AND EXISTS (
          SELECT 1 FROM public.transactions purchase
          WHERE purchase.import_id = i.id AND purchase.group_id = i.group_id
            AND purchase.bankaccount_id = i.account_id AND purchase.removed IS NOT TRUE
            AND (purchase.card_name IS NULL OR purchase.card_last4 IS NULL)
        )
      ORDER BY i.id
    `);
    const updates: CardUpdate[] = [];
    let conflictingRows = 0;
    let unsupportedImports = 0;
    for (const record of imports) {
      const config = ImportMappingConfigSchema.safeParse(record.mapping_config);
      if (
        !config.success ||
        !record.content ||
        record.content.length !== Number(record.file_size) ||
        createHash('sha256').update(record.content).digest('hex') !==
          record.file_hash.trim()
      ) {
        throw new Error(
          'Card backfill requires a verified CSV and saved mapping',
        );
      }
      const names = readImportSourceColumn(record.content, config.data, 1);
      const digits = readImportSourceColumn(record.content, config.data, 2);
      const header = (value: string | undefined) =>
        value
          ?.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      if (
        !config.data.hasHeader ||
        header(names.get(1)) !== 'nome no cartao' ||
        header(digits.get(1)) !== 'final do cartao'
      ) {
        unsupportedImports += 1;
        continue;
      }
      const purchases = await queryRunner.manager.query<
        Array<{
          id: string;
          source_row: number | null;
          card_name: string | null;
          card_last4: string | null;
        }>
      >(
        `SELECT id, source_row, card_name, card_last4 FROM public.transactions
         WHERE import_id = $1 AND group_id = $2 AND bankaccount_id = $3
           AND removed IS NOT TRUE ORDER BY id`,
        [record.id, record.group_id, record.account_id],
      );
      const seen = new Set<number>();
      for (const purchase of purchases) {
        const row = purchase.source_row;
        const rawName = row === null ? undefined : names.get(row);
        const rawDigits = row === null ? undefined : digits.get(row);
        if (
          row === null ||
          seen.has(row) ||
          rawName === undefined ||
          rawDigits === undefined
        ) {
          throw new Error(
            'Card backfill requires unique, verifiable source rows',
          );
        }
        seen.add(row);
        const name = CardNameSchema.nullable().safeParse(rawName || null);
        const last4 = ImportCardLast4CellSchema.safeParse(rawDigits);
        if (!name.success || !last4.success) {
          throw new Error(
            'Card backfill source contains invalid card metadata',
          );
        }
        if (
          (purchase.card_name !== null && purchase.card_name !== name.data) ||
          (purchase.card_last4 !== null && purchase.card_last4 !== last4.data)
        ) {
          conflictingRows += 1;
          continue;
        }
        const nextName = purchase.card_name ?? name.data;
        const nextLast4 = purchase.card_last4 ?? last4.data;
        if (
          nextName === purchase.card_name &&
          nextLast4 === purchase.card_last4
        )
          continue;
        updates.push({
          id: purchase.id,
          import_id: record.id,
          group_id: record.group_id,
          account_id: record.account_id,
          old_name: purchase.card_name,
          old_last4: purchase.card_last4,
          card_name: nextName,
          card_last4: nextLast4,
        });
      }
    }
    return { updates, conflictingRows, unsupportedImports };
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    const { updates } = await this.plan(queryRunner);
    if (updates.length === 0) return;
    const [result] = await queryRunner.manager.query<Array<{ count: number }>>(
      `WITH changed AS (
         UPDATE public.transactions purchase
         SET card_name = source.card_name, card_last4 = source.card_last4
         FROM jsonb_to_recordset($1::jsonb) AS source(
           id bigint, import_id bigint, group_id bigint, account_id bigint,
           old_name text, old_last4 text, card_name text, card_last4 text
         )
         WHERE purchase.id = source.id AND purchase.import_id = source.import_id
           AND purchase.group_id = source.group_id AND purchase.bankaccount_id = source.account_id
           AND purchase.removed IS NOT TRUE
           AND purchase.card_name IS NOT DISTINCT FROM source.old_name
           AND purchase.card_last4 IS NOT DISTINCT FROM source.old_last4
         RETURNING purchase.id
       ) SELECT count(*)::integer AS count FROM changed`,
      [JSON.stringify(updates)],
    );
    if (result.count !== updates.length)
      throw new Error(
        'Card backfill stopped because a transaction changed concurrently',
      );
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error(
        'Card backfill is forward-only; do not remove subsequent manual card edits',
      ),
    );
  }
}
