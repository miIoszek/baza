import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 1:1 with `user_account.id` (the company owner). */
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 10 })
  nip!: string;

  @Column({ type: 'varchar', length: 2000, default: '' })
  description!: string;

  @Column({ name: 'base_location', type: 'varchar', length: 200, default: '' })
  baseLocation!: string;

  @Column({ name: 'base_lat', type: 'double precision', nullable: true })
  baseLat!: number | null;

  @Column({ name: 'base_lng', type: 'double precision', nullable: true })
  baseLng!: number | null;

  @Column({ name: 'photo_key', type: 'text', nullable: true })
  photoKey!: string | null;

  @Column({ name: 'photo_urls', type: 'jsonb', nullable: true })
  photoUrls!: Record<string, string> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
