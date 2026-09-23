import { COUNTRIES, type CountryOption } from '@baza/shared-types';

type RouteLeg = {
  from?: { code?: string };
  to?: { code?: string };
};

/** Distinct allowlisted countries that appear on published offer routes. */
export function uniqueRouteCountries(
  routesByOffer: ReadonlyArray<ReadonlyArray<RouteLeg>>
): CountryOption[] {
  const codes = new Set<string>();
  for (const routes of routesByOffer) {
    for (const leg of routes) {
      const from = leg.from?.code?.trim().toUpperCase();
      const to = leg.to?.code?.trim().toUpperCase();
      if (from) {
        codes.add(from);
      }
      if (to) {
        codes.add(to);
      }
    }
  }
  return COUNTRIES.filter((c) => codes.has(c.code));
}
