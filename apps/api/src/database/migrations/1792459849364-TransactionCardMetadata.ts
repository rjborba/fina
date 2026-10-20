import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionCardMetadata1792459849364
  implements MigrationInterface
{
  name = 'TransactionCardMetadata1792459849364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.transactions
        ADD COLUMN card_name text CHECK (
          card_name IS NULL OR (
            card_name = btrim(card_name) AND length(card_name) BETWEEN 1 AND 80
            AND card_name !~ '[[:cntrl:]]'
            AND length(regexp_replace(normalize(card_name, NFKC), '[^0-9]', '', 'g')) < 8
          )
        ),
        ADD COLUMN card_last4 text CHECK (card_last4 ~ '^[0-9]{4}$')
    `);
    // Preserve attribution on all purchases, including archived cards and
    // soft-deleted transactions. Never touch amounts, dates, or source files.
    await queryRunner.query(`
      UPDATE public.transactions purchase
      SET card_name = card.name, card_last4 = card.last4
      FROM public.credit_cards card
      WHERE purchase.credit_card_id = card.id
        AND purchase.group_id = card.group_id
        AND purchase.bankaccount_id = card.account_id
    `);
    await queryRunner.query(`
      DROP TRIGGER validate_transaction_credit_card ON public.transactions;
      DROP FUNCTION private.validate_transaction_credit_card();
      ALTER TABLE public.transactions DROP COLUMN credit_card_id;
      DROP TABLE public.credit_cards;
      DROP FUNCTION private.validate_credit_card_parent()
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private.preserve_credit_account_type() RETURNS trigger
      LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
      BEGIN
        IF NEW.type <> 'credit' AND EXISTS (
          SELECT 1 FROM public.transactions purchase
          WHERE purchase.bankaccount_id = NEW.id AND purchase.group_id = NEW.group_id
            AND (purchase.card_name IS NOT NULL OR purchase.card_last4 IS NOT NULL)
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'An account with card purchases must remain a credit account';
        END IF;
        RETURN NEW;
      END;
      $function$
    `);
    await queryRunner.query(`
      CREATE FUNCTION private.validate_transaction_card_metadata() RETURNS trigger
      LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
      BEGIN
        IF NEW.card_name IS NULL AND NEW.card_last4 IS NULL THEN RETURN NEW; END IF;
        IF TG_OP = 'UPDATE' AND NEW.bankaccount_id IS DISTINCT FROM OLD.bankaccount_id THEN
          NEW.card_name := NULL;
          NEW.card_last4 := NULL;
          RETURN NEW;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.bankaccounts account
          WHERE account.id = NEW.bankaccount_id AND account.group_id = NEW.group_id AND account.type = 'credit') THEN
          RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Card details require a credit account in the same group';
        END IF;
        RETURN NEW;
      END;
      $function$
    `);
    await queryRunner.query(`
      CREATE TRIGGER validate_transaction_card_metadata
      BEFORE INSERT OR UPDATE OF card_name, card_last4, bankaccount_id, group_id
      ON public.transactions FOR EACH ROW EXECUTE FUNCTION private.validate_transaction_card_metadata()
    `);
    await queryRunner.query(`
      REVOKE ALL PRIVILEGES ON FUNCTION private.validate_transaction_card_metadata()
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      CREATE INDEX transactions_card_metadata_idx
      ON public.transactions (group_id, bankaccount_id, card_name, card_last4)
      WHERE removed IS NOT TRUE
    `);
    // An old identifier column could contain names OR digits. Keep the generic
    // mapping but require an explicit choice rather than guessing its meaning.
    // Historical imports keep their original mapping for audit/reprocessing.
    await queryRunner.query(`
      UPDATE public.import_profiles
      SET mapping_config = mapping_config - 'creditCardColumn' - 'creditCardMappings'
        || '{"cardNameColumn": null, "cardLast4Column": null}'::jsonb
      WHERE mapping_config ? 'creditCardColumn' OR mapping_config ? 'creditCardMappings'
    `);
    await queryRunner.query("NOTIFY pgrst, 'reload schema'");
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error(
        'TransactionCardMetadata is forward-only; independent card records require a backup to recover',
      ),
    );
  }
}
