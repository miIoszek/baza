import type { CountryCode } from './country';

/** One endpoint of a route leg (ISO code + display name). */
export interface RouteCountry {
  code: CountryCode;
  name: string;
}

/** A route direction the company operates (e.g. Poland → Italy). */
export interface RouteDirection {
  from: RouteCountry;
  to: RouteCountry;
}
