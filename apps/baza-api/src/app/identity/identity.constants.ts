/** Tunables for the identity module. Compile-time constants on purpose: per-environment values
 * (keys, issuer, cookie/site settings) come from `IdentityConfig`, never from `process.env` read
 * inside a service. */

export const ACCESS_TOKEN_AUDIENCE = 'baza-api';

/** Every verifier asserts the declared purpose, so a refresh token can never authenticate a request. */
export const ACCESS_TOKEN_TYPE = 'access';

/** Short, so ban / password change (which bump `sessionEpoch`) bite quickly even with the guard cache. */
export const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sliding idle expiry: every rotation issues a fresh full TTL. */
export const REFRESH_TOKEN_TTL_MS = 30 * DAY_MS;

/** Two parallel 401-recovery paths present the same refresh token within milliseconds; inside this
 * window the second one is forgiven (fresh sibling) instead of being read as theft. */
export const REFRESH_ROTATION_GRACE_MS = 10_000;
export const REFRESH_MAX_GRACE_REISSUES = 3;

export const EMAIL_VERIFICATION_TTL_MS = DAY_MS;
/** Short on purpose — a reset link is a bearer credential sitting in a mailbox. */
export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

/** Account-keyed lockout, in Postgres so it holds even though the throttler is per-process. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 10;
export const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_EMAIL_LENGTH = 254;

/** Guard's per-process account cache. A ban is visible on other replicas within this window. */
export const ACCOUNT_CACHE_TTL_MS = 5_000;

export const COMPANY_ROLE = 'company';

/** Stable names for log-based counters/alerts. */
export const IDENTITY_METRICS = {
  refreshRotated: 'auth.refresh.rotated',
  refreshGraceReissued: 'auth.refresh.grace_reissued',
  refreshReuseDetected: 'auth.security.refresh_reuse_detected',
  refreshUnknown: 'auth.refresh.unknown_token',
  refreshExpired: 'auth.refresh.expired',
  familyRevoked: 'auth.refresh.family_revoked',
  accountLocked: 'auth.security.lockout',
  loginSucceeded: 'auth.login.succeeded',
  loginFailed: 'auth.login.failed',
  oneTimeTokenConsumed: 'auth.one_time_token.consumed',
  oneTimeTokenRejected: 'auth.one_time_token.rejected',
} as const;

/** Injection tokens. */
export const IDENTITY_CONFIG = 'identity:config';
