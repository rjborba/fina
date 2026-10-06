import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryAppearance1790553422000 implements MigrationInterface {
  name = 'CategoryAppearance1790553422000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.categories
        ADD COLUMN icon text NOT NULL DEFAULT 'tag',
        ADD COLUMN color text NOT NULL DEFAULT 'yellow',
        ADD CONSTRAINT categories_icon_check CHECK (
          icon IN (
            'tag',
            'shopping-cart',
            'utensils',
            'car',
            'house',
            'heart-pulse',
            'plane',
            'gamepad-2'
          )
        ),
        ADD CONSTRAINT categories_color_check CHECK (
          color IN ('yellow', 'lime', 'sky', 'violet', 'danger')
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.categories
        DROP CONSTRAINT categories_color_check,
        DROP CONSTRAINT categories_icon_check,
        DROP COLUMN color,
        DROP COLUMN icon
    `);
  }
}
