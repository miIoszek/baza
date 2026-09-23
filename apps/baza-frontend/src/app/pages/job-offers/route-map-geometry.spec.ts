import {
  aggregateRouteCorridors,
  buildRouteMapLegs,
  hasRouteMapGeometry,
  routeMapLegEmphasis,
} from './route-map-geometry';
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

  it('keeps every hop whose both countries have centroids', () => {
    const all: CountryCentroid[] = [
      ...centroids,
      { code: 'AT', namePl: 'Austria', lat: 47.6, lng: 14.1 },
      { code: 'IT', namePl: 'Włochy', lat: 42.5, lng: 12.5 },
      { code: 'FR', namePl: 'Francja', lat: 46.6, lng: 2.5 },
    ];
    const many: RouteDirection[] = [
      { from: { code: 'PL', name: 'Polska' }, to: { code: 'DE', name: 'Niemcy' } },
      { from: { code: 'PL', name: 'Polska' }, to: { code: 'AT', name: 'Austria' } },
      { from: { code: 'PL', name: 'Polska' }, to: { code: 'IT', name: 'Włochy' } },
      { from: { code: 'DE', name: 'Niemcy' }, to: { code: 'FR', name: 'Francja' } },
    ];
    expect(buildRouteMapLegs(many, all).map((l) => l.label)).toEqual([
      'PL→DE',
      'PL→AT',
      'PL→IT',
      'DE→FR',
    ]);
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

  it('aggregates identical hops and keeps distinct corridors separate', () => {
    const plDe = {
      from: { lat: 52.1, lng: 19.4 },
      to: { lat: 51.2, lng: 10.5 },
    };
    const corridors = aggregateRouteCorridors([
      { ...plDe, label: 'offer-1' },
      { ...plDe, label: 'offer-2' },
      { ...plDe, label: 'offer-3' },
      {
        from: { lat: 52.1, lng: 19.4 },
        to: { lat: 47.6, lng: 14.1 },
        label: 'offer-1',
      },
    ]);
    expect(corridors.map((c) => c.count).sort((a, b) => b - a)).toEqual([3, 1]);
    const busy = corridors.find((c) => c.count === 3);
    expect(busy?.labels).toEqual(['offer-1', 'offer-2', 'offer-3']);
  });

  it('dims other hops when a hovered route is on the map', () => {
    const labels = ['PL→DE', 'PL→AT', 'DE→FR'];
    expect(routeMapLegEmphasis('PL→AT', 'PL→AT', labels)).toEqual({
      dimmed: false,
      emphasized: true,
    });
    expect(routeMapLegEmphasis('PL→AT', 'PL→DE', labels)).toEqual({
      dimmed: true,
      emphasized: false,
    });
    expect(routeMapLegEmphasis(null, 'PL→DE', labels)).toEqual({
      dimmed: false,
      emphasized: false,
    });
    expect(routeMapLegEmphasis('XX→YY', 'PL→DE', labels)).toEqual({
      dimmed: false,
      emphasized: false,
    });
  });
});
