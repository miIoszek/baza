import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  DriverLicenseCategory,
  GeoPoint,
  HomeReturnCadence,
  JobOffer,
  JobOfferFilters,
  RouteDirection,
  TransportType,
} from '@baza/shared-types';
import { isDriverLicenseCategory } from '@baza/shared-types';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import {
  CreateJobOfferDto,
  UpdateJobOfferDto,
} from './dto/job-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';

type OfferRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  home_return_cadence: string;
  required_years_experience: number;
  required_transport_type: string;
  license_category?: string | null;
  routes: RouteDirection[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  companies?: {
    base_lat: number | null;
    base_lng: number | null;
    base_location: string | null;
  } | null;
};

@Injectable()
export class JobOfferService {
  private readonly logger = new Logger(JobOfferService.name);

  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

  parseListQuery(query: ListOffersQueryDto): JobOfferFilters {
    const hasLat = query.nearLat != null && !Number.isNaN(query.nearLat);
    const hasLng = query.nearLng != null && !Number.isNaN(query.nearLng);
    if (hasLat !== hasLng) {
      throw new BadRequestException(
        'Podaj obie współrzędne nearLat i nearLng albo żadnej'
      );
    }

    const countries = query.countries
      ? query.countries
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      : undefined;

    const filters: JobOfferFilters = {};
    if (countries?.length) {
      filters.countries = countries;
    }
    if (query.cadence) {
      filters.homeReturnCadence = query.cadence as HomeReturnCadence;
    }
    if (query.license) {
      if (!isDriverLicenseCategory(query.license)) {
        throw new BadRequestException('Nieprawidłowa kategoria prawa jazdy');
      }
      filters.licenseCategory = query.license;
    }
    if (hasLat && hasLng) {
      filters.near = { lat: query.nearLat as number, lng: query.nearLng as number };
    }
    return filters;
  }

  async createForUser(
    userId: string,
    dto: CreateJobOfferDto
  ): Promise<JobOffer> {
    this.assertSalary(dto);
    const company = await this.requireCompanyForUser(userId);
    const published = dto.published ?? true;
    this.assertCanPublish(published, company.base_lat, company.base_lng);

    const row = this.dtoToInsert(company.id, dto, published);
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .insert(row)
      .select('*, companies(base_lat, base_lng, base_location)')
      .single();

    if (error || !data) {
      this.logger.warn(`Offer create failed: ${error?.message}`);
      throw new BadRequestException('Nie udało się utworzyć oferty');
    }
    return this.mapOffer(data as OfferRow);
  }

  async updateForUser(
    userId: string,
    offerId: string,
    dto: UpdateJobOfferDto
  ): Promise<JobOffer> {
    this.assertSalary(dto);
    const company = await this.requireCompanyForUser(userId);

    const existing = await this.getOwnedOffer(company.id, offerId);
    if (!existing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    const nextPublished = dto.published ?? existing.published;
    this.assertCanPublish(nextPublished, company.base_lat, company.base_lng);

    const patch = this.dtoToInsert(company.id, dto, nextPublished);
    delete (patch as { company_id?: string }).company_id;
    patch['updated_at'] = new Date().toISOString();

    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .update(patch)
      .eq('id', offerId)
      .eq('company_id', company.id)
      .select('*, companies(base_lat, base_lng, base_location)')
      .single();

    if (error || !data) {
      this.logger.warn(`Offer update failed: ${error?.message}`);
      throw new BadRequestException('Nie udało się zaktualizować oferty');
    }
    return this.mapOffer(data as OfferRow);
  }

  async unpublishForUser(userId: string, offerId: string): Promise<JobOffer> {
    const company = await this.requireCompanyForUser(userId);
    const existing = await this.getOwnedOffer(company.id, offerId);
    if (!existing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .update({ published: false, updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .eq('company_id', company.id)
      .select('*, companies(base_lat, base_lng, base_location)')
      .single();

    if (error || !data) {
      throw new BadRequestException('Nie udało się wycofać oferty');
    }
    return this.mapOffer(data as OfferRow);
  }

  async listForOwner(userId: string): Promise<JobOffer[]> {
    const company = await this.requireCompanyForUser(userId);
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('*, companies(base_lat, base_lng, base_location)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.warn(`Owner offers list failed: ${error.message}`);
      throw new BadRequestException('Nie udało się pobrać ofert');
    }
    return ((data ?? []) as OfferRow[]).map((r) => this.mapOffer(r));
  }

  async listPublished(filters: JobOfferFilters = {}): Promise<JobOffer[]> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('*, companies(base_lat, base_lng, base_location)')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.warn(`Public offers list failed: ${error.message}`);
      throw new BadRequestException('Nie udało się pobrać ofert');
    }

    let offers = ((data ?? []) as OfferRow[]).map((r) => this.mapOffer(r));
    offers = offers.filter((o) => this.matchesFilters(o, filters));
    if (filters.near) {
      offers = this.sortByNear(offers, filters.near);
    }
    return offers;
  }

  async listPublishedByCompany(companyId: string): Promise<JobOffer[]> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('*, companies(base_lat, base_lng, base_location)')
      .eq('company_id', companyId)
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Nie udało się pobrać ofert');
    }
    return ((data ?? []) as OfferRow[]).map((r) => this.mapOffer(r));
  }

  async getPublishedById(id: string): Promise<JobOffer> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('*, companies(base_lat, base_lng, base_location)')
      .eq('id', id)
      .eq('published', true)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Oferta nie znaleziona');
    }
    return this.mapOffer(data as OfferRow);
  }

  /** Exposed for unit tests of matching rules. */
  matchesFilters(offer: JobOffer, filters: JobOfferFilters): boolean {
    if (filters.countries?.length) {
      const set = new Set(filters.countries.map((c) => c.toUpperCase()));
      const hit = offer.routes.some(
        (leg) => set.has(leg.from.code) || set.has(leg.to.code)
      );
      if (!hit) {
        return false;
      }
    }

    if (filters.homeReturnCadence) {
      const f = filters.homeReturnCadence;
      const o = offer.homeReturnCadence;
      const ok = f === 'flexible' || o === 'flexible' || f === o;
      if (!ok) {
        return false;
      }
    }

    if (filters.licenseCategory) {
      if (offer.licenseCategory !== filters.licenseCategory) {
        return false;
      }
    }

    return true;
  }

  /** Exposed for unit tests of near sort. */
  sortByNear(offers: JobOffer[], near: GeoPoint): JobOffer[] {
    return [...offers].sort((a, b) => {
      const da = a.baseLocation
        ? this.haversineKm(near, a.baseLocation)
        : Number.POSITIVE_INFINITY;
      const db = b.baseLocation
        ? this.haversineKm(near, b.baseLocation)
        : Number.POSITIVE_INFINITY;
      if (da === db) {
        return 0;
      }
      return da < db ? -1 : 1;
    });
  }

  private haversineKm(a: GeoPoint, b: GeoPoint): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private async requireCompanyForUser(userId: string): Promise<{
    id: string;
    base_lat: number | null;
    base_lng: number | null;
  }> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('companies')
      .select('id, base_lat, base_lng')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Profil firmy nie znaleziony');
    }
    return {
      id: data.id as string,
      base_lat: (data.base_lat as number | null) ?? null,
      base_lng: (data.base_lng as number | null) ?? null,
    };
  }

  private async getOwnedOffer(
    companyId: string,
    offerId: string
  ): Promise<Pick<OfferRow, 'id' | 'published'> | null> {
    const { data } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('id, published')
      .eq('id', offerId)
      .eq('company_id', companyId)
      .maybeSingle();
    return (data as Pick<OfferRow, 'id' | 'published'> | null) ?? null;
  }

  private assertSalary(dto: CreateJobOfferDto | UpdateJobOfferDto): void {
    const hasSalary =
      dto.salaryMin != null ||
      dto.salaryMax != null ||
      !!dto.salaryCurrency;
    if (!hasSalary) {
      return;
    }
    if (!dto.salaryCurrency || dto.salaryCurrency.length !== 3) {
      throw new BadRequestException('Nieprawidłowa waluta wynagrodzenia');
    }
    if (
      dto.salaryMin != null &&
      dto.salaryMax != null &&
      dto.salaryMin > dto.salaryMax
    ) {
      throw new BadRequestException(
        'Minimalne wynagrodzenie nie może być większe od maksymalnego'
      );
    }
  }

  private assertCanPublish(
    published: boolean,
    lat: number | null,
    lng: number | null
  ): void {
    if (published !== true) {
      return;
    }
    if (lat == null || lng == null) {
      throw new BadRequestException(
        'Aby opublikować ofertę, ustaw współrzędne lokalizacji firmy w profilu (szerokość i długość geograficzna)'
      );
    }
  }

  private dtoToInsert(
    companyId: string,
    dto: CreateJobOfferDto | UpdateJobOfferDto,
    published: boolean
  ): Record<string, unknown> {
    const hasSalary =
      dto.salaryMin != null ||
      dto.salaryMax != null ||
      !!dto.salaryCurrency;

    const row: Record<string, unknown> = {
      company_id: companyId,
      title: dto.title,
      description: dto.description,
      home_return_cadence: dto.homeReturnCadence,
      required_years_experience: dto.requiredYearsExperience,
      required_transport_type: dto.requiredTransportType,
      license_category: dto.licenseCategory,
      routes: dto.routes,
      salary_min: hasSalary ? (dto.salaryMin ?? null) : null,
      salary_max: hasSalary ? (dto.salaryMax ?? null) : null,
      salary_currency: hasSalary ? (dto.salaryCurrency ?? null) : null,
      published,
    };

    return row;
  }

  private mapOffer(row: OfferRow): JobOffer {
    const co = row.companies;
    let baseLocation: GeoPoint | null = null;
    if (co?.base_lat != null && co?.base_lng != null) {
      baseLocation = { lat: co.base_lat, lng: co.base_lng };
    }

    const salary =
      row.salary_currency != null
        ? {
            currency: row.salary_currency,
            ...(row.salary_min != null ? { min: Number(row.salary_min) } : {}),
            ...(row.salary_max != null ? { max: Number(row.salary_max) } : {}),
          }
        : undefined;

    const licenseCategory = this.resolveLicenseCategory(row);

    return {
      id: row.id,
      companyId: row.company_id,
      title: row.title,
      description: row.description,
      homeReturnCadence: row.home_return_cadence as HomeReturnCadence,
      requiredYearsExperience: row.required_years_experience,
      requiredTransportType: row.required_transport_type as TransportType,
      licenseCategory,
      routes: row.routes,
      salary,
      baseLocation,
      companyBaseLocationText: co?.base_location ?? null,
      published: row.published,
      publishedAt: row.created_at,
    };
  }

  /** Legacy rows without a category default to C; unknown non-empty values fail loud. */
  private resolveLicenseCategory(row: OfferRow): DriverLicenseCategory {
    const raw = row.license_category;
    if (raw == null || raw === '') {
      return 'C';
    }
    if (isDriverLicenseCategory(raw)) {
      return raw;
    }
    this.logger.error(
      `Unexpected license_category on job_offers.id=${row.id}: ${JSON.stringify(raw)}`
    );
    throw new InternalServerErrorException('Nieprawidłowe dane oferty');
  }
}
