import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobOffer } from './job-offer.entity';

@Entity({ name: 'job_applications' })
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_offer_id', type: 'uuid' })
  jobOfferId!: string;

  @ManyToOne(() => JobOffer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer?: JobOffer;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 16 })
  phone!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  message!: string | null;

  @Column({ name: 'cv_file_key', type: 'text' })
  cvFileKey!: string;

  @Column({ name: 'consent_accepted_at', type: 'timestamptz' })
  consentAcceptedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
