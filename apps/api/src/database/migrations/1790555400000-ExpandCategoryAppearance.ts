import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCategoryAppearance1790555400000
  implements MigrationInterface
{
  name = 'ExpandCategoryAppearance1790555400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.categories
        DROP CONSTRAINT categories_icon_check,
        DROP CONSTRAINT categories_color_check,
        ADD CONSTRAINT categories_icon_check CHECK (
          icon IN (
            'tag',
            'shopping-cart',
            'utensils',
            'car',
            'house',
            'heart-pulse',
            'plane',
            'gamepad-2',
            'briefcase',
            'book-open',
            'coffee',
            'dumbbell',
            'gift',
            'paw-print',
            'shirt',
            'smartphone',
            'music',
            'baby',
            'wrench',
            'wallet-cards',
            'bike',
            'camera',
            'graduation-cap',
            'sparkles'
          )
        ),
        ADD CONSTRAINT categories_color_check CHECK (
          color IN (
            'yellow',
            'lime',
            'sky',
            'violet',
            'danger',
            'amber',
            'orange',
            'rose',
            'pink',
            'fuchsia',
            'indigo',
            'teal'
          )
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.categories
        DROP CONSTRAINT categories_icon_check,
        DROP CONSTRAINT categories_color_check,
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
}
