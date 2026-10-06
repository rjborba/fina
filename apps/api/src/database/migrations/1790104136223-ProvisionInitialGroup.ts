import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProvisionInitialGroup1790104136223 implements MigrationInterface {
  name = 'ProvisionInitialGroup1790104136223';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO ''
      AS $function$
      DECLARE
        initial_group_id bigint;
      BEGIN
        INSERT INTO public.users (id, email, name, avatar, meta_data)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data ->> 'name',
          NEW.raw_user_meta_data ->> 'avatar_url',
          NEW.raw_user_meta_data
        );

        INSERT INTO public.groups (name)
        VALUES ('My finances')
        RETURNING id INTO initial_group_id;

        INSERT INTO public.user_group (group_id, user_id, role)
        VALUES (initial_group_id, NEW.id, 'owner');

        RETURN NEW;
      END;
      $function$
    `);

    await queryRunner.query(`
      DO $backfill$
      DECLARE
        profile record;
        initial_group_id bigint;
      BEGIN
        FOR profile IN
          SELECT app_user.id
          FROM public.users app_user
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.user_group membership
            WHERE membership.user_id = app_user.id
          )
          ORDER BY app_user.created_at, app_user.id
        LOOP
          INSERT INTO public.groups (name)
          VALUES ('My finances')
          RETURNING id INTO initial_group_id;

          INSERT INTO public.user_group (group_id, user_id, role)
          VALUES (initial_group_id, profile.id, 'owner');
        END LOOP;
      END;
      $backfill$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION private.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO ''
      AS $function$
      BEGIN
        INSERT INTO public.users (id, email, name, avatar, meta_data)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data ->> 'name',
          NEW.raw_user_meta_data ->> 'avatar_url',
          NEW.raw_user_meta_data
        );
        RETURN NEW;
      END;
      $function$
    `);
  }
}
