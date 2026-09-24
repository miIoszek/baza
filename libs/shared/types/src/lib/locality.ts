/** Query limits for GET /api/geo/localities (company base address). */
export const LOCALITY_QUERY_MIN_LENGTH = 2;
export const LOCALITY_QUERY_MAX_LENGTH = 80;
export const LOCALITY_SEARCH_LIMIT = 8;

/**
 * A Polish locality to put the company base pin on (from the PRNG register).
 * Locality precision: the base's street address stays free text.
 */
export interface LocalitySuggestion {
  /** TERYT SIMC id. */
  id: string;
  name: string;
  /** "miasto", "wieś", "osada", "kolonia" or "przysiółek". */
  kind: string;
  /** "gm. Kórnik, pow. poznański, woj. wielkopolskie", without parts equal to the name. */
  area: string;
  lat: number;
  lng: number;
}
