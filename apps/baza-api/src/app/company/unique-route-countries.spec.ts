import { uniqueRouteCountries } from './unique-route-countries';

describe('uniqueRouteCountries', () => {
  it('returns only allowlisted countries present on routes, in picker order', () => {
    const result = uniqueRouteCountries([
      [
        { from: { code: 'pl' }, to: { code: 'DE' } },
        { from: { code: 'DE' }, to: { code: 'IT' } },
      ],
      [{ from: { code: 'PL' }, to: { code: 'XX' } }],
      [],
    ]);
    expect(result.map((c) => c.code)).toEqual(['PL', 'DE', 'IT']);
    expect(result.find((c) => c.code === 'PL')?.namePl).toBe('Polska');
  });

  it('returns empty when no published routes have country codes', () => {
    expect(uniqueRouteCountries([[], [{ from: {}, to: {} }]])).toEqual([]);
  });
});
