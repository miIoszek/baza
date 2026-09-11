import { COUNTRIES, type CountryCentroid } from '@baza/shared-types';

/** Rough country centroids for route polylines (not routing-quality). */
const CENTROID_BY_CODE: Record<string, { lat: number; lng: number }> = {
  PL: { lat: 52.1, lng: 19.4 },
  DE: { lat: 51.2, lng: 10.5 },
  CZ: { lat: 49.8, lng: 15.5 },
  SK: { lat: 48.7, lng: 19.7 },
  AT: { lat: 47.6, lng: 14.1 },
  HU: { lat: 47.2, lng: 19.5 },
  LT: { lat: 55.2, lng: 24.0 },
  LV: { lat: 56.9, lng: 24.1 },
  EE: { lat: 58.6, lng: 25.0 },
  NL: { lat: 52.1, lng: 5.3 },
  BE: { lat: 50.5, lng: 4.5 },
  LU: { lat: 49.8, lng: 6.1 },
  FR: { lat: 46.6, lng: 2.5 },
  IT: { lat: 42.5, lng: 12.5 },
  ES: { lat: 40.2, lng: -3.7 },
  PT: { lat: 39.4, lng: -8.2 },
  IE: { lat: 53.1, lng: -8.0 },
  DK: { lat: 56.0, lng: 10.0 },
  SE: { lat: 62.0, lng: 15.0 },
  FI: { lat: 64.0, lng: 26.0 },
  RO: { lat: 45.9, lng: 24.9 },
  BG: { lat: 42.7, lng: 25.5 },
  HR: { lat: 45.1, lng: 15.2 },
  SI: { lat: 46.1, lng: 14.8 },
  GR: { lat: 39.1, lng: 22.9 },
  CY: { lat: 35.1, lng: 33.4 },
  MT: { lat: 35.9, lng: 14.4 },
  UA: { lat: 49.0, lng: 32.0 },
  BY: { lat: 53.7, lng: 28.0 },
  RU: { lat: 55.8, lng: 37.6 },
  TR: { lat: 39.0, lng: 35.0 },
  GB: { lat: 54.0, lng: -2.5 },
  CH: { lat: 46.8, lng: 8.2 },
  NO: { lat: 62.0, lng: 10.0 },
  RS: { lat: 44.0, lng: 21.0 },
  BA: { lat: 44.2, lng: 17.8 },
  MK: { lat: 41.6, lng: 21.7 },
  MD: { lat: 47.0, lng: 28.9 },
  AL: { lat: 41.1, lng: 20.2 },
};

export function listCountryCentroids(): CountryCentroid[] {
  return COUNTRIES.map((c) => {
    const point = CENTROID_BY_CODE[c.code];
    if (!point) {
      throw new Error(`Missing centroid for country ${c.code}`);
    }
    return {
      code: c.code,
      namePl: c.namePl,
      lat: point.lat,
      lng: point.lng,
    };
  });
}
