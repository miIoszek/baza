import type { HomeReturnCadence } from './home-return-cadence';
import type { RouteDirection } from './route-direction';
import type { GeoPoint } from './company';
import type { TransportType } from './transport-type';
import type { DriverLicenseCategory } from './driver-license';
import type { EmploymentForm } from './employment-form';

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
  requiredTransportType: TransportType;
  /** Wire code (`C_E` not `C+E`). */
  licenseCategory: DriverLicenseCategory;
  /** At least one form; matching is set overlap. */
  employmentForms: EmploymentForm[];
  description: string;
  salary?: SalaryRange;
  /** Map pin = company base location for MVP (null if company has no coords). */
  baseLocation: GeoPoint | null;
  /** Text address from company (always available when company exists). */
  companyBaseLocationText: string | null;
  /** Display name from joined company row. */
  companyName: string;
  /** Rewritten public photo URLs from company (null if none). */
  companyPhotoUrls: Record<string, string> | null;
  published: boolean;
  publishedAt: string;
}

export interface CreateJobOfferRequest {
  title: string;
  routes: RouteDirection[];
  homeReturnCadence: HomeReturnCadence;
  requiredYearsExperience: number;
  requiredTransportType: TransportType;
  description: string;
  licenseCategory: DriverLicenseCategory;
  employmentForms: EmploymentForm[];
  /** Wire format matches Nest DTO (flat fields, not nested SalaryRange). */
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  /** Defaults to true. Requires company base_lat/base_lng when true. */
  published?: boolean;
}

export interface UpdateJobOfferRequest {
  title: string;
  routes: RouteDirection[];
  homeReturnCadence: HomeReturnCadence;
  requiredYearsExperience: number;
  requiredTransportType: TransportType;
  description: string;
  licenseCategory: DriverLicenseCategory;
  employmentForms: EmploymentForm[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  published: boolean;
}

/** Public list query shape (Nest `GET /api/offers`). */
export interface JobOfferFilters {
  countries?: string[];
  homeReturnCadences?: HomeReturnCadence[];
  licenseCategories?: DriverLicenseCategory[];
  requiredTransportTypes?: TransportType[];
  employmentForms?: EmploymentForm[];
  /** Optional: nearest-first when driver shares location. */
  near?: GeoPoint;
}
