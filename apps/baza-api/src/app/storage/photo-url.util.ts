/**
 * Rewrites legacy photo URLs that used the R2 S3 API host to the configured
 * R2_PUBLIC_URL (r2.dev or custom domain). Does not mutate stored DB values.
 */
export function rewriteR2PhotoUrls(
  photoUrls: Record<string, string> | null
): Record<string, string> | null {
  if (!photoUrls) {
    return null;
  }

  const publicBase = process.env['R2_PUBLIC_URL']?.trim()?.replace(/\/$/, '');
  if (!publicBase || publicBase.includes('.r2.cloudflarestorage.com')) {
    return photoUrls;
  }

  const rewritten: Record<string, string> = {};
  for (const [key, url] of Object.entries(photoUrls)) {
    rewritten[key] = rewriteR2PhotoUrl(url, publicBase);
  }
  return rewritten;
}

export function rewriteR2PhotoUrl(url: string, publicBase: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('.r2.cloudflarestorage.com')) {
      // Preserve ?v= (and any other) cache-bust query from stored URLs.
      return `${publicBase}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // keep original on parse failure
  }
  return url;
}
