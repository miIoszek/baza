import { buildRouteMapLegs, hasRouteMapGeometry } from './route-map-geometry';
import type { CountryCentroid, RouteDirection } from '@baza/shared-types';

describe('route-map-geometry', () => {
  const centroids: CountryCentroid[] = [
    { code: 'PL', namePl: 'Polska', lat: 52.1, lng: 19.4 },
    { code: 'DE', namePl: 'Niemcy', lat: 51.2, lng: 10.5 },
  ];

  const routes: RouteDirection[] = [
    {
      from: { code: 'PL', name: 'Polska' },
      to: { code: 'DE', name: 'Niemcy' },
    },
    {
      from: { code: 'DE', name: 'Niemcy' },
      to: { code: 'XX', name: 'Unknown' },
    },
  ];

  it('builds legs and skips missing centroids', () => {
    const legs = buildRouteMapLegs(routes, centroids);
    expect(legs).toHaveLength(1);
    expect(legs[0].label).toBe('PL→DE');
  });

  it('detects geometry from legs or base pin', () => {
    expect(hasRouteMapGeometry(null, [])).toBe(false);
    expect(hasRouteMapGeometry({ lat: 52, lng: 21 }, [])).toBe(true);
    expect(
      hasRouteMapGeometry(null, [
        {
          from: { lat: 1, lng: 2 },
          to: { lat: 3, lng: 4 },
          label: 'A→B',
        },
      ])
    ).toBe(true);
  });
});
