const PANEL_PATHS = new Set([
  '/login',
  '/register',
  '/check-email',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

/** Auth + company panel default to dark when the user has no stored theme. */
export function isBazaPanelUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  return PANEL_PATHS.has(path) || path === '/company' || path.startsWith('/company/');
}

/** Public offers list uses a full-bleed split layout (no page padding). */
export function isBazaFlushLayoutUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  return path === '/' || path === '';
}
