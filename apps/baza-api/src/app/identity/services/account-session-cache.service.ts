import { Injectable } from '@nestjs/common';
import { ACCOUNT_CACHE_TTL_MS } from '../identity.constants';

export type CachedAccount = {
  email: string;
  roles: string[];
  sessionEpoch: number;
  usable: boolean;
};

/**
 * Tiny per-process cache of the account fields the guard re-checks on every request. Changes made
 * through this process (password change, ban) invalidate it immediately; on OTHER replicas a
 * revocation is visible within ACCOUNT_CACHE_TTL_MS.
 */
@Injectable()
export class AccountSessionCache {
  private readonly entries = new Map<
    string,
    { value: CachedAccount; expiresAt: number }
  >();

  get(userId: string): CachedAccount | null {
    const hit = this.entries.get(userId);
    if (!hit || hit.expiresAt <= Date.now()) {
      this.entries.delete(userId);
      return null;
    }
    return hit.value;
  }

  set(userId: string, value: CachedAccount): void {
    this.entries.set(userId, {
      value,
      expiresAt: Date.now() + ACCOUNT_CACHE_TTL_MS,
    });
  }

  invalidate(userId: string): void {
    this.entries.delete(userId);
  }
}
