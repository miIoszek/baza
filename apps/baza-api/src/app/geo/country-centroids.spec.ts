import { listCountryCentroids } from './country-centroids';
import { COUNTRY_CODES } from '@baza/shared-types';

describe('listCountryCentroids', () => {
  it('returns finite lat/lng for every allowlisted country', () => {
    const list = listCountryCentroids();
    expect(list).toHaveLength(COUNTRY_CODES.length);
    for (const row of list) {
      expect(COUNTRY_CODES).toContain(row.code);
      expect(Number.isFinite(row.lat)).toBe(true);
      expect(Number.isFinite(row.lng)).toBe(true);
      expect(row.lat).toBeGreaterThanOrEqual(-90);
      expect(row.lat).toBeLessThanOrEqual(90);
      expect(row.lng).toBeGreaterThanOrEqual(-180);
      expect(row.lng).toBeLessThanOrEqual(180);
    }
  });
});
