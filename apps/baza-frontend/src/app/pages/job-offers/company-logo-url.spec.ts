import { describe, expect, it } from 'vitest';
import { pickCompanyLogoUrl } from './company-logo-url';

describe('pickCompanyLogoUrl', () => {
  it('prefers s48 then s96 then original', () => {
    expect(
      pickCompanyLogoUrl({
        original: 'o',
        s96: 'm',
        s48: 's',
      })
    ).toBe('s');
    expect(pickCompanyLogoUrl({ original: 'o', s96: 'm' })).toBe('m');
    expect(pickCompanyLogoUrl({ original: 'o' })).toBe('o');
  });

  it('returns null for missing urls', () => {
    expect(pickCompanyLogoUrl(null)).toBeNull();
    expect(pickCompanyLogoUrl(undefined)).toBeNull();
    expect(pickCompanyLogoUrl({})).toBeNull();
  });
});
