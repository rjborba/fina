import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Imports } from './import.entity';

@Entity('import_files', { schema: 'public' })
export class ImportFiles {
  @PrimaryColumn('bigint', { name: 'import_id' })
  importId: string;

  @Column('bytea', { name: 'content', select: false })
  content: Buffer;

  @OneToOne(() => Imports, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn([{ name: 'import_id', referencedColumnName: 'id' }])
  import: Imports;

  constructor(data: Partial<ImportFiles>) {
    Object.assign(this, data);
  }
}
