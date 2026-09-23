const MAX_LENGTH = 255;

/**
 * Display-safe CV name for the company inbox: last path segment only, no control
 * characters, collapsed whitespace, at most 255 chars with the extension kept.
 * Returns null when nothing usable is left.
 */
export function sanitizeCvFileName(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const base = raw.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[\t\n\v\f\r]/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return null;
  }
  if (cleaned.length <= MAX_LENGTH) {
    return cleaned;
  }
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, MAX_LENGTH - ext.length) + ext;
}
