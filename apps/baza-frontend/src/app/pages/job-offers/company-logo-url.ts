/** Prefer list-size logo; fall back to larger variants. */
export function pickCompanyLogoUrl(
  urls: Record<string, string> | null | undefined
): string | null {
  if (!urls) {
    return null;
  }
  return (
    urls['s48'] ??
    urls['s96'] ??
    urls['original'] ??
    Object.values(urls).find((u) => typeof u === 'string' && u.length > 0) ??
    null
  );
}
