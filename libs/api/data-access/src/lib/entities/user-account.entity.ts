import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserAccountStatus = 'active' | 'banned' | 'deleted';

/**
 * Identity of a person who can sign in. Owned by the identity module; business tables
 * (e.g. `companies.user_id`) reference `id` only.
 */
@Entity({ name: 'user_account' })
export class UserAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Always stored lowercase (DB CHECK enforces it). */
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  /** `select: false` — must be requested explicitly, never leaks via a stray `find()`. */
  @Column({
    name: 'password_hash',
    type: 'text',
    nullable: true,
    select: false,
  })
  passwordHash!: string | null;

  @Column({ type: 'text', array: true, default: () => `'{}'` })
  roles!: string[];

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: UserAccountStatus;

  @Column({ name: 'can_login', type: 'boolean', default: true })
  canLogin!: boolean;

  /**
   * Bumped on password change / ban / delete. An access token whose `epc` claim is behind this
   * value is dead regardless of `exp`.
   */
  @Column({ name: 'session_epoch', type: 'integer', default: 1 })
  sessionEpoch!: number;

  @Column({ name: 'failed_login_count', type: 'integer', default: 0 })
  failedLoginCount!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
