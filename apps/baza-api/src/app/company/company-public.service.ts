import { DataSource } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Company } from '@baza/api-data-access';
import type {
  CompanyDirectoryItem,
  CompanyPublicProfile,
} from '@baza/shared-types';
import { rewriteR2PhotoUrls } from '../storage/photo-url.util';

@Injectable()
export class CompanyPublicService {
  private readonly logger = new Logger(CompanyPublicService.name);

  constructor(private readonly dataSource: DataSource) {}

  async list(): Promise<CompanyDirectoryItem[]> {
    try {
      // One aggregate query instead of loading every published offer to count in memory.
      const rows: {
        id: string;
        name: string;
        base_location: string;
        photo_urls: Record<string, string> | null;
        offer_count: number;
      }[] = await this.dataSource.query(
        `SELECT c.id, c.name, c.base_location, c.photo_urls,
                COUNT(o.id)::int AS offer_count
           FROM companies c
           LEFT JOIN job_offers o ON o.company_id = c.id AND o.published = true
          GROUP BY c.id
          ORDER BY c.created_at DESC, c.id DESC`
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        baseLocation: row.base_location,
        photoUrls: rewriteR2PhotoUrls(row.photo_urls ?? null),
        offerCount: row.offer_count,
      }));
    } catch (error) {
      this.logger.warn(
        `Public companies list failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Nie udało się pobrać listy pracodawców');
    }
  }

  async getById(id: string): Promise<CompanyPublicProfile> {
    const company = await this.dataSource
      .getRepository(Company)
      .findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return {
      id: company.id,
      name: company.name,
      nip: company.nip,
      description: company.description,
      baseLocation: company.baseLocation,
      baseLat: company.baseLat ?? null,
      baseLng: company.baseLng ?? null,
      photoUrls: rewriteR2PhotoUrls(company.photoUrls ?? null),
    };
  }
}
