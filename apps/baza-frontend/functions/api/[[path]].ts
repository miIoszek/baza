/**
 * Cloudflare Pages Function: same-origin proxy `/api/*` -> the Railway API.
 *
 * Why it exists: the refresh token is an HttpOnly `SameSite=Strict` cookie. Strict cookies are only
 * sent same-site, and `*.up.railway.app` is on the Public Suffix List, so a SPA on `*.pages.dev`
 * calling the Railway hostname directly can neither set nor send it. Serving `/api` from the SPA's
 * own origin makes the cookie first-party. Once the API lives on a same-site subdomain of the SPA's
 * domain (e.g. api.example.com), this function is unnecessary: set API_BASE_URL and delete it.
 *
 * Required environment (Pages project settings):
 *   API_ORIGIN           e.g. https://baza-api-production-4306.up.railway.app
 *   PROXY_SHARED_SECRET  same value as on the API; lets the API trust X-Baza-Client-IP
 *
 * The API rate-limits per client IP. Behind this proxy it would only ever see Cloudflare's egress
 * addresses, so the real client IP is forwarded in X-Baza-Client-IP together with the secret. Any
 * X-Baza-* header sent by the browser is dropped first, so it cannot be spoofed.
 */
interface Env {
  API_ORIGIN?: string;
  PROXY_SHARED_SECRET?: string;
}

const HOP_BY_HOP = ['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade'];

export const onRequest = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  if (!env.API_ORIGIN || !env.PROXY_SHARED_SECRET) {
    return Response.json(
      { statusCode: 500, message: 'API proxy is not configured' },
      { status: 500 }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, env.API_ORIGIN);

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) {
    headers.delete(name);
  }
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith('x-baza-')) {
      headers.delete(name);
    }
  }
  headers.set('x-baza-proxy-secret', env.PROXY_SHARED_SECRET);
  headers.set('x-baza-client-ip', request.headers.get('cf-connecting-ip') ?? '');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });
};
