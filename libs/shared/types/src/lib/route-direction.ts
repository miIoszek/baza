/** ISO 3166-1 alpha-2 country code used for route matching. */
export type CountryCode = string;

/** A route direction the company operates (e.g. Poland → Italy). */
export interface RouteDirection {
  fromCountry: CountryCode;
  toCountry: CountryCode;
}
