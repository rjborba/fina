import { MigrationInterface, QueryRunner } from 'typeorm';

export class BankAccountInstitution1791200000000 implements MigrationInterface {
  name = 'BankAccountInstitution1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.bankaccounts
      ADD COLUMN institution_id text,
      ADD CONSTRAINT bankaccounts_institution_id_check
      CHECK (institution_id IN (
        'inter', 'itau', 'nubank', 'banco-do-brasil', 'caixa', 'bradesco',
        'santander', 'c6', 'btg-pactual', 'safra', 'sicredi', 'sicoob',
        'banrisul', 'banco-pan', 'banco-bv', 'bmg', 'neon', 'picpay',
        'mercado-pago', 'pagbank', 'xp'
      ))
    `);

    // Freeze these aliases with the migration. Update only the new branding
    // column, including archived accounts; preserve financial history and names.
    await queryRunner.query(`
      WITH normalized_accounts AS (
        SELECT id, regexp_replace(
          translate(lower(normalize(name, NFC)),
            'áàâãäéèêëíìîïóòôõöúùûüç',
            'aaaaaeeeeiiiiooooouuuuc'),
          '[^a-z0-9]+', ' ', 'g'
        ) AS normalized_name
        FROM public.bankaccounts
      ), institution_aliases (institution_id, alias_pattern) AS (
        VALUES
          ('inter', 'inter'),
          ('itau', 'itau'),
          ('nubank', 'nubank|nu bank'),
          ('banco-do-brasil', 'banco do brasil|bb'),
          ('caixa', 'caixa|cef'),
          ('bradesco', 'bradesco'),
          ('santander', 'santander'),
          ('c6', 'c6|c 6'),
          ('btg-pactual', 'btg|btg pactual'),
          ('safra', 'safra'),
          ('sicredi', 'sicredi'),
          ('sicoob', 'sicoob'),
          ('banrisul', 'banrisul'),
          ('banco-pan', 'pan'),
          ('banco-bv', 'bv|banco votorantim'),
          ('bmg', 'bmg'),
          ('neon', 'neon'),
          ('picpay', 'picpay|pic pay'),
          ('mercado-pago', 'mercado pago|mercadopago'),
          ('pagbank', 'pagbank|pag bank|pagseguro'),
          ('xp', 'xp')
      ), unambiguous_matches AS (
        SELECT account.id, min(institution.institution_id) AS institution_id
        FROM normalized_accounts account
        INNER JOIN institution_aliases institution
          ON account.normalized_name ~
            ('(^| )(' || institution.alias_pattern || ')( |$)')
        GROUP BY account.id
        HAVING count(*) = 1
      )
      UPDATE public.bankaccounts account
      SET institution_id = matched.institution_id
      FROM unambiguous_matches matched
      WHERE account.id = matched.id
    `);
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error('BankAccountInstitution is a forward-only migration'),
    );
  }
}
