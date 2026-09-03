import type { HomeReturnCadence } from './home-return-cadence';
import type { RouteDirection } from './route-direction';
import type { GeoPoint } from './company';

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
}

export interface JobOffer {
  id: string;
  companyId: string;
  title: string;
  routes: RouteDirection[];
  homeReturnCadence: HomeReturnCadence;
  requiredYearsExperience: number;
  requiredTransportType: string;
  description: string;
  salary?: SalaryRange;
  /** Map pin = company base location for MVP. */
  baseLocation: GeoPoint;
  publishedAt: string;
}

export interface CreateJobOfferRequest {
  title: string;
  routes: RouteDirection[];
  homeReturnCadence: HomeReturnCadence;
  requiredYearsExperience: number;
  requiredTransportType: string;
  description: string;
  salary?: SalaryRange;
}

export interface JobOfferFilters {
  routesToCountries?: string[];
  homeReturnCadence?: HomeReturnCadence;
  /** Optional: nearest-first when driver shares location. */
  near?: GeoPoint;
}
