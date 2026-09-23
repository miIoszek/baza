import { isBazaAuthUrl, isBazaFlushLayoutUrl, isBazaPanelUrl } from './baza-panel-url';

describe('isBazaAuthUrl', () => {
  it('drops the app bar only on sign-in and password screens', () => {
    expect(isBazaAuthUrl('/login?returnUrl=%2Fcompany%2Finbox')).toBe(true);
    expect(isBazaAuthUrl('/reset-password?token=x')).toBe(true);
    expect(isBazaAuthUrl('/company/profile')).toBe(false);
    expect(isBazaAuthUrl('/')).toBe(false);
  });
});

describe('isBazaPanelUrl', () => {
  it('treats public marketplace routes as not panel', () => {
    expect(isBazaPanelUrl('/')).toBe(false);
    expect(isBazaPanelUrl('/job-offers/abc')).toBe(false);
    expect(isBazaPanelUrl('/companies')).toBe(false);
    expect(isBazaPanelUrl('/companies/1')).toBe(false);
    expect(isBazaPanelUrl('/health')).toBe(false);
  });

  it('uses flush layout only on the public offers list', () => {
    expect(isBazaFlushLayoutUrl('/')).toBe(true);
    expect(isBazaFlushLayoutUrl('/?countries=IT')).toBe(true);
    expect(isBazaFlushLayoutUrl('/job-offers/abc')).toBe(false);
    expect(isBazaFlushLayoutUrl('/companies')).toBe(false);
    expect(isBazaFlushLayoutUrl('/login')).toBe(false);
  });

  it('treats auth and company panel routes as panel', () => {
    expect(isBazaPanelUrl('/login')).toBe(true);
    expect(isBazaPanelUrl('/register?step=2')).toBe(true);
    expect(isBazaPanelUrl('/forgot-password')).toBe(true);
    expect(isBazaPanelUrl('/company/profile')).toBe(true);
    expect(isBazaPanelUrl('/company/offers/new')).toBe(true);
  });
});
