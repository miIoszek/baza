import { isIP } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

type Req = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Rate-limit key = the real client IP. Behind the Cloudflare Pages `/api` proxy every request
 * arrives from Cloudflare's egress addresses, which would put all users in one bucket. The proxy
 * therefore forwards `X-Baza-Client-IP` together with a shared secret; the header is honoured ONLY
 * when the secret matches (timing-safe), so a client cannot pick its own bucket.
 */
@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as Req;
    const secret = process.env['PROXY_SHARED_SECRET']?.trim();
    const provided = request.headers?.['x-baza-proxy-secret'];
    const clientIp = request.headers?.['x-baza-client-ip'];

    if (
      secret &&
      typeof provided === 'string' &&
      safeEqual(provided, secret) &&
      typeof clientIp === 'string' &&
      isIP(clientIp.trim()) !== 0
    ) {
      return clientIp.trim();
    }
    return request.ip ?? 'unknown';
  }
}
