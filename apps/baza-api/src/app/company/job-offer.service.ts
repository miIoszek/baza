import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company, JobOffer as JobOfferEntity } from '@baza/api-data-access';
import type {
  DriverLicenseCategory,
  GeoPoint,
  HomeReturnCadence,
  JobOffer,
  JobOfferFilters,
  RouteDirection,
  TransportType,
} from '@baza/shared-types';
import { isDriverLicenseCategory, isTransportType } from '@baza/shared-types';
import { rewriteR2PhotoUrls } from '../storage/photo-url.util';
import { R2StorageService } from '../storage/r2-storage.service';
import {
  CreateJobOfferDto,
  UpdateJobOfferDto,
} from './dto/job-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';

@Injectable()
export class JobOfferService {
  private readonly logger = new Logger(JobOfferService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2StorageService
  ) {}

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
    if (query.transport) {
      if (!isTransportType(query.transport)) {
        throw new BadRequestException('Nieprawidłowy typ transportu');
      }
      filters.requiredTransportType = query.transport;
    }
    if (hasLat && hasLng) {
      filters.near = { lat: query.nearLat as number, lng: query.nearLng as number };
    }
    return filters;
  }

  private get offers() {
    return this.dataSource.getRepository(JobOfferEntity);
  }

  async createForUser(
    userId: string,
    dto: CreateJobOfferDto
  ): Promise<JobOffer> {
    this.assertSalary(dto);
    const company = await this.requireCompanyForUser(userId);
    const published = dto.published ?? true;
    this.assertCanPublish(published, company.baseLat, company.baseLng);

    try {
      const saved = await this.offers.save(
        this.offers.create({
          companyId: company.id,
          ...this.dtoToColumns(dto, published),
        })
      );
      return this.mapOffer(await this.loadWithCompany(saved.id));
    } catch (error) {
      this.logger.warn(`Offer create failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się utworzyć oferty');
    }
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
    this.assertCanPublish(nextPublished, company.baseLat, company.baseLng);

    try {
      await this.offers.update(
        { id: offerId, companyId: company.id },
        this.dtoToColumns(dto, nextPublished)
      );
      return this.mapOffer(await this.loadWithCompany(offerId));
    } catch (error) {
      this.logger.warn(`Offer update failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się zaktualizować oferty');
    }
  }

  async unpublishForUser(userId: string, offerId: string): Promise<JobOffer> {
    const company = await this.requireCompanyForUser(userId);
    const existing = await this.getOwnedOffer(company.id, offerId);
    if (!existing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    try {
      await this.offers.update(
        { id: offerId, companyId: company.id },
        { published: false }
      );
      return this.mapOffer(await this.loadWithCompany(offerId));
    } catch (error) {
      this.logger.warn(`Offer unpublish failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się wycofać oferty');
    }
  }

  /**
   * Hard-delete an owned offer. Purges private R2 CVs under the offer prefix
   * before deleting the row (applications cascade via FK).
   */
  async deleteForUser(userId: string, offerId: string): Promise<void> {
    const company = await this.requireCompanyForUser(userId);
    const existing = await this.getOwnedOffer(company.id, offerId);
    if (!existing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    if (!this.r2.isPrivateConfigured()) {
      const hasApps = await this.offerHasApplications(company.id, offerId);
      if (hasApps) {
        throw new ServiceUnavailableException(
          'Nie można usunąć oferty z aplikacjami: magazyn CV (private R2) jest niedostępny'
        );
      }
      await this.deleteOwnedOfferRow(company.id, offerId);
      return;
    }

    await this.r2.deletePrivatePrefixOrThrow(
      `applications/${company.id}/${offerId}`
    );
    await this.deleteOwnedOfferRow(company.id, offerId);
  }

  async listForOwner(userId: string): Promise<JobOffer[]> {
    const company = await this.requireCompanyForUser(userId);
    try {
      const rows = await this.offers.find({
        where: { companyId: company.id },
        relations: { company: true },
        order: { createdAt: 'DESC' },
      });
      return rows.map((r) => this.mapOffer(r));
    } catch (error) {
      this.logger.warn(`Owner offers list failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się pobrać ofert');
    }
  }

  async listPublished(filters: JobOfferFilters = {}): Promise<JobOffer[]> {
    let rows: JobOfferEntity[];
    try {
      rows = await this.offers.find({
        where: { published: true },
        relations: { company: true },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.warn(`Public offers list failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się pobrać ofert');
    }

    let offers = rows.map((r) => this.mapOffer(r));
    offers = offers.filter((o) => this.matchesFilters(o, filters));
    if (filters.near) {
      offers = this.sortByNear(offers, filters.near);
    }
    return offers;
  }

  async listPublishedByCompany(companyId: string): Promise<JobOffer[]> {
    try {
      const rows = await this.offers.find({
        where: { companyId, published: true },
        relations: { company: true },
        order: { createdAt: 'DESC' },
      });
      return rows.map((r) => this.mapOffer(r));
    } catch {
      throw new BadRequestException('Nie udało się pobrać ofert');
    }
  }

  async getPublishedById(id: string): Promise<JobOffer> {
    const row = await this.offers.findOne({
      where: { id, published: true },
      relations: { company: true },
    });
    if (!row) {
      throw new NotFoundException('Oferta nie znaleziona');
    }
    return this.mapOffer(row);
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

    if (filters.requiredTransportType) {
      if (offer.requiredTransportType !== filters.requiredTransportType) {
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

  private async loadWithCompany(id: string): Promise<JobOfferEntity> {
    return this.offers.findOneOrFail({
      where: { id },
      relations: { company: true },
    });
  }

  private async requireCompanyForUser(
    userId: string
  ): Promise<Pick<Company, 'id' | 'baseLat' | 'baseLng'>> {
    const company = await this.dataSource.getRepository(Company).findOne({
      where: { userId },
      select: { id: true, baseLat: true, baseLng: true },
    });
    if (!company) {
      throw new NotFoundException('Profil firmy nie znaleziony');
    }
    return company;
  }

  private getOwnedOffer(
    companyId: string,
    offerId: string
  ): Promise<Pick<JobOfferEntity, 'id' | 'published'> | null> {
    return this.offers.findOne({
      where: { id: offerId, companyId },
      select: { id: true, published: true },
    });
  }

  private async offerHasApplications(
    companyId: string,
    offerId: string
  ): Promise<boolean> {
    try {
      const rows: unknown[] = await this.dataSource.query(
        'SELECT 1 FROM job_applications WHERE job_offer_id = $1 AND company_id = $2 LIMIT 1',
        [offerId, companyId]
      );
      return rows.length > 0;
    } catch (error) {
      this.logger.warn(
        `Offer applications probe failed (offer=${offerId}): ${errorMessage(error)}`
      );
      throw new InternalServerErrorException(
        'Nie udało się sprawdzić aplikacji powiązanych z ofertą'
      );
    }
  }

  private async deleteOwnedOfferRow(
    companyId: string,
    offerId: string
  ): Promise<void> {
    try {
      await this.offers.delete({ id: offerId, companyId });
    } catch (error) {
      this.logger.warn(`Offer delete failed: ${errorMessage(error)}`);
      throw new BadRequestException('Nie udało się usunąć oferty');
    }
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

  private dtoToColumns(
    dto: CreateJobOfferDto | UpdateJobOfferDto,
    published: boolean
  ): Partial<JobOfferEntity> {
    const hasSalary =
      dto.salaryMin != null || dto.salaryMax != null || !!dto.salaryCurrency;

    return {
      title: dto.title,
      description: dto.description,
      homeReturnCadence: dto.homeReturnCadence,
      requiredYearsExperience: dto.requiredYearsExperience,
      requiredTransportType: dto.requiredTransportType,
      licenseCategory: dto.licenseCategory,
      routes: dto.routes,
      salaryMin:
        hasSalary && dto.salaryMin != null ? String(dto.salaryMin) : null,
      salaryMax:
        hasSalary && dto.salaryMax != null ? String(dto.salaryMax) : null,
      salaryCurrency: hasSalary ? (dto.salaryCurrency ?? null) : null,
      published,
    };
  }

  private mapOffer(row: JobOfferEntity): JobOffer {
    const co = row.company;
    let baseLocation: GeoPoint | null = null;
    if (co?.baseLat != null && co?.baseLng != null) {
      baseLocation = { lat: co.baseLat, lng: co.baseLng };
    }

    const salary =
      row.salaryCurrency != null
        ? {
            currency: row.salaryCurrency,
            ...(row.salaryMin != null ? { min: Number(row.salaryMin) } : {}),
            ...(row.salaryMax != null ? { max: Number(row.salaryMax) } : {}),
          }
        : undefined;

    return {
      id: row.id,
      companyId: row.companyId,
      title: row.title,
      description: row.description,
      homeReturnCadence: row.homeReturnCadence as HomeReturnCadence,
      requiredYearsExperience: row.requiredYearsExperience,
      requiredTransportType: row.requiredTransportType as TransportType,
      licenseCategory: this.resolveLicenseCategory(row),
      routes: row.routes,
      salary,
      baseLocation,
      companyBaseLocationText: co?.baseLocation ?? null,
      companyName: (co?.name ?? '').trim(),
      companyPhotoUrls: rewriteR2PhotoUrls(co?.photoUrls ?? null),
      published: row.published,
      publishedAt: row.createdAt.toISOString(),
    };
  }

  /** Legacy rows without a category default to C; unknown non-empty values fail loud. */
  private resolveLicenseCategory(row: JobOfferEntity): DriverLicenseCategory {
    const raw = row.licenseCategory;
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
