import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';

/** Stored shape of one route leg (structurally identical to the API contract's RouteDirection). */
export interface StoredRouteDirection {
  from: { code: string; name: string };
  to: { code: string; name: string };
}

@Entity({ name: 'job_offers' })
export class JobOffer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 2000 })
  description!: string;

  @Column({ name: 'home_return_cadence', type: 'varchar', length: 32 })
  homeReturnCadence!: string;

  @Column({ name: 'required_years_experience', type: 'integer' })
  requiredYearsExperience!: number;

  @Column({ name: 'required_transport_type', type: 'varchar', length: 32 })
  requiredTransportType!: string;

  @Column({ name: 'license_category', type: 'varchar', length: 8, default: 'C' })
  licenseCategory!: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  routes!: StoredRouteDirection[];

  /** numeric(12,2) — the driver returns a string; callers convert with Number(). */
  @Column({
    name: 'salary_min',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salaryMin!: string | null;

  @Column({
    name: 'salary_max',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salaryMax!: string | null;

  @Column({
    name: 'salary_currency',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  salaryCurrency!: string | null;

  @Column({ type: 'boolean', default: true })
  published!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
