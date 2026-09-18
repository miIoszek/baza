import { generateKeyPairSync } from 'node:crypto';
import { Logger } from '@nestjs/common';

export type SigningKeyStatus = 'active' | 'retiring';

export type IdentitySigningKey = {
  kid: string;
  /** PKCS#8 PEM of a P-256 private key. */
  privateKeyPem: string;
  status: SigningKeyStatus;
};

export type IdentityConfig = {
  issuer: string;
  signingKeys: IdentitySigningKey[];
  /** Absolute origin of the SPA; used to build emailed links. */
  webBaseUrl: string;
  /** Origins allowed to call the cookie endpoints (Origin/Referer check). */
  allowedOrigins: string[];
  cookie: { name: string; secure: boolean; domain?: string };
  mail: {
    transport: 'resend' | 'log';
    resendApiKey?: string;
    from: string;
    replyTo?: string;
  };
  /** When false, login does not require a verified email (bootstrap while mail is not wired up). */
  requireEmailVerification: boolean;
};

type Env = Record<string, string | undefined>;

const logger = new Logger('IdentityConfig');

/**
 * `AUTH_JWT_SIGNING_KEYS` = base64(JSON([{ kid, status, privateKeyPemBase64 }])). Exactly one key
 * is `active`; `retiring` keys keep verifying until their tokens expire (key rotation without
 * logging anyone out).
 */
export function parseSigningKeys(raw: string): IdentitySigningKey[] {
  let entries: unknown;
  try {
    entries = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    throw new Error('AUTH_JWT_SIGNING_KEYS is not valid base64-encoded JSON');
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('AUTH_JWT_SIGNING_KEYS must be a non-empty array');
  }
  return entries.map((entry, index) => {
    const e = entry as {
      kid?: unknown;
      status?: unknown;
      privateKeyPemBase64?: unknown;
    };
    if (
      typeof e.kid !== 'string' ||
      !e.kid ||
      (e.status !== 'active' && e.status !== 'retiring') ||
      typeof e.privateKeyPemBase64 !== 'string'
    ) {
      throw new Error(`AUTH_JWT_SIGNING_KEYS[${index}] is malformed`);
    }
    return {
      kid: e.kid,
      status: e.status,
      privateKeyPem: Buffer.from(e.privateKeyPemBase64, 'base64').toString(
        'utf8'
      ),
    };
  });
}

function ephemeralDevKey(): IdentitySigningKey {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    kid: `dev-${Date.now()}`,
    status: 'active',
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function csv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function loadIdentityConfig(env: Env = process.env): IdentityConfig {
  const isProduction = env['NODE_ENV'] === 'production';

  const rawKeys = env['AUTH_JWT_SIGNING_KEYS']?.trim();
  if (!rawKeys && isProduction) {
    throw new Error('AUTH_JWT_SIGNING_KEYS is required in production');
  }
  let signingKeys: IdentitySigningKey[];
  if (rawKeys) {
    signingKeys = parseSigningKeys(rawKeys);
  } else {
    // Sessions do not survive a restart in dev; that is the price of no key file on disk.
    logger.warn('AUTH_JWT_SIGNING_KEYS unset: using an ephemeral dev signing key');
    signingKeys = [ephemeralDevKey()];
  }

  const webBaseUrl = (
    env['AUTH_WEB_BASE_URL']?.trim() ||
    (isProduction ? '' : 'http://localhost:4200')
  ).replace(/\/+$/, '');
  if (!webBaseUrl) {
    throw new Error('AUTH_WEB_BASE_URL is required in production');
  }

  const allowedOrigins = csv(env['AUTH_ALLOWED_ORIGINS']).length
    ? csv(env['AUTH_ALLOWED_ORIGINS'])
    : csv(env['CORS_ORIGIN']).length
      ? csv(env['CORS_ORIGIN'])
      : [webBaseUrl];

  const secure = env['AUTH_SECURE_COOKIES']
    ? env['AUTH_SECURE_COOKIES'] === 'true'
    : isProduction;

  const resendApiKey = env['RESEND_API_KEY']?.trim();
  const transport =
    (env['MAIL_TRANSPORT']?.trim() as 'resend' | 'log' | undefined) ??
    (resendApiKey ? 'resend' : 'log');
  if (transport === 'resend' && !resendApiKey) {
    throw new Error('MAIL_TRANSPORT=resend requires RESEND_API_KEY');
  }
  if (transport === 'log' && isProduction) {
    logger.warn(
      'MAIL_TRANSPORT=log in production: verification and reset emails are only logged'
    );
  }

  return {
    issuer: env['AUTH_TOKEN_ISSUER']?.trim() || 'baza-api',
    signingKeys,
    webBaseUrl,
    allowedOrigins,
    cookie: {
      // `__Host-` needs Secure + Path=/ + no Domain; plain name when cookies are not Secure (dev).
      name: secure ? '__Host-baza_rt' : 'baza_rt',
      secure,
      domain: undefined,
    },
    mail: {
      transport,
      resendApiKey,
      from: env['MAIL_FROM']?.trim() || 'Baza <no-reply@localhost>',
      replyTo: env['MAIL_REPLY_TO']?.trim() || undefined,
    },
    requireEmailVerification:
      env['AUTH_REQUIRE_EMAIL_VERIFICATION'] !== 'false',
  };
}
