import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type RefreshRevocationReason =
  | 'logout'
  | 'reuse-detected'
  | 'password-changed'
  | 'password-reset'
  | 'account-disabled'
  | 'account-deleted';

/** Only the SHA-256 of the opaque token is stored — a DB leak cannot hand anyone a session. */
@Entity({ name: 'refresh_token' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** All tokens descended from one login share a family; reuse of any revokes the family. */
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: 'integer' })
  generation!: number;

  /**
   * The account's `session_epoch` when this token was issued. A token from an older epoch is dead
   * even if it survived a revocation race (see RefreshTokenService).
   */
  @Column({ name: 'session_epoch', type: 'integer' })
  sessionEpoch!: number;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  revokedReason!: RefreshRevocationReason | null;

  @Column({ name: 'grace_reissue_count', type: 'integer', default: 0 })
  graceReissueCount!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
