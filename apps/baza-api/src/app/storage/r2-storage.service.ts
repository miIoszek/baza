import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp, { type Metadata } from 'sharp';
import { APPLICATION_CV_MAX_BYTES } from '@baza/shared-types';

const VARIANT_SIZES = [48, 96, 192, 512] as const;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PIXELS = 40_000_000; // ~6k x 6k
const CV_MIME = 'application/pdf';

export type CompanyPhotoUrls = {
  original: string;
  s48: string;
  s96: string;
  s192: string;
  s512: string;
};

type PublicR2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

type PrivateR2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

@Injectable()
export class R2StorageService {
  private publicClient: S3Client | null = null;
  private privateClient: S3Client | null = null;

  private getPublicConfig(): PublicR2Config | null {
    const accountId = process.env['R2_ACCOUNT_ID']?.trim();
    const accessKeyId = process.env['R2_ACCESS_KEY_ID']?.trim();
    const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY']?.trim();
    const bucket = process.env['R2_BUCKET']?.trim() || 'baza-uploads';
    const publicUrl = process.env['R2_PUBLIC_URL']?.trim()?.replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !publicUrl) {
      return null;
    }

    if (publicUrl.includes('.r2.cloudflarestorage.com')) {
      return null;
    }

    return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
  }

  private getPrivateConfig(): PrivateR2Config | null {
    const accountId =
      process.env['R2_PRIVATE_ACCOUNT_ID']?.trim() ||
      process.env['R2_ACCOUNT_ID']?.trim();
    const accessKeyId =
      process.env['R2_PRIVATE_ACCESS_KEY_ID']?.trim() ||
      process.env['R2_ACCESS_KEY_ID']?.trim();
    const secretAccessKey =
      process.env['R2_PRIVATE_SECRET_ACCESS_KEY']?.trim() ||
      process.env['R2_SECRET_ACCESS_KEY']?.trim();
    const bucket = process.env['R2_PRIVATE_BUCKET']?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return null;
    }

    return { accountId, accessKeyId, secretAccessKey, bucket };
  }

  isConfigured(): boolean {
    return this.getPublicConfig() !== null;
  }

  isPrivateConfigured(): boolean {
    return this.getPrivateConfig() !== null;
  }

  private getPublicClient(): S3Client {
    if (this.publicClient) {
      return this.publicClient;
    }
    const cfg = this.getPublicConfig();
    if (!cfg) {
      throw new ServiceUnavailableException('R2 is not configured');
    }
    this.publicClient = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    return this.publicClient;
  }

  private getPrivateClient(): S3Client {
    if (this.privateClient) {
      return this.privateClient;
    }
    const cfg = this.getPrivateConfig();
    if (!cfg) {
      throw new ServiceUnavailableException('Private R2 is not configured');
    }
    this.privateClient = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    return this.privateClient;
  }

  /**
   * Upload logo under a unique versioned prefix:
   * `companies/{companyId}/logos/{versionId}/…`
   */
  async uploadCompanyLogo(
    companyId: string,
    buffer: Buffer,
    claimedMime: string
  ): Promise<{ photoKey: string; photoUrls: CompanyPhotoUrls }> {
    const cfg = this.getPublicConfig();
    if (!cfg) {
      throw new ServiceUnavailableException('R2 is not configured');
    }

    if (!ALLOWED_MIME.has(claimedMime)) {
      throw new BadRequestException(
        'Dozwolone są tylko pliki JPEG, PNG lub WebP'
      );
    }

    let meta: Metadata;
    try {
      meta = await sharp(buffer, { failOn: 'error' }).metadata();
    } catch {
      throw new BadRequestException('Invalid or corrupted image file');
    }

    const format = meta.format;
    const detectedMime =
      format === 'jpeg'
        ? 'image/jpeg'
        : format === 'png'
          ? 'image/png'
          : format === 'webp'
            ? 'image/webp'
            : null;

    if (!detectedMime || !ALLOWED_MIME.has(detectedMime)) {
      throw new BadRequestException(
        'Dozwolone są tylko pliki JPEG, PNG lub WebP'
      );
    }

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width * height > MAX_PIXELS) {
      throw new BadRequestException('Image dimensions are too large');
    }

    const versionId = randomUUID();
    const baseKey = `companies/${companyId}/logos/${versionId}`;

    try {
      const ext =
        detectedMime === 'image/png'
          ? 'png'
          : detectedMime === 'image/webp'
            ? 'webp'
            : 'jpg';

      const originalKey = `${baseKey}/original.${ext}`;
      await this.putPublic(cfg.bucket, originalKey, buffer, detectedMime);

      const urls: CompanyPhotoUrls = {
        original: `${cfg.publicUrl}/${originalKey}`,
        s48: '',
        s96: '',
        s192: '',
        s512: '',
      };

      for (const size of VARIANT_SIZES) {
        const webp = await sharp(buffer)
          .rotate()
          .resize(size, size, { fit: 'cover' })
          .webp({ quality: 82 })
          .toBuffer();
        const key = `${baseKey}/s${size}.webp`;
        await this.putPublic(cfg.bucket, key, webp, 'image/webp');
        urls[`s${size}` as keyof CompanyPhotoUrls] =
          `${cfg.publicUrl}/${key}`;
      }

      return { photoKey: baseKey, photoUrls: urls };
    } catch (err) {
      await this.deletePrefix(baseKey);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Failed to process or upload image');
    }
  }

  /**
   * Upload CV to the private bucket. Returns storage key only — never a public URL.
   * Does not require `R2_PUBLIC_URL`.
   */
  async uploadApplicationCv(
    companyId: string,
    offerId: string,
    buffer: Buffer,
    claimedMime: string
  ): Promise<{ key: string; prefix: string }> {
    const cfg = this.getPrivateConfig();
    if (!cfg) {
      throw new ServiceUnavailableException('Private R2 is not configured');
    }

    if (claimedMime !== CV_MIME) {
      throw new BadRequestException('Dozwolone są tylko pliki PDF');
    }

    if (buffer.length > APPLICATION_CV_MAX_BYTES) {
      throw new BadRequestException('Plik CV jest zbyt duży (max 5 MB)');
    }

    if (buffer.length < 5 || buffer.subarray(0, 5).toString('utf8') !== '%PDF-') {
      throw new BadRequestException('Nieprawidłowy plik PDF');
    }

    const versionId = randomUUID();
    const prefix = `applications/${companyId}/${offerId}/${versionId}`;
    const key = `${prefix}/cv.pdf`;

    try {
      await this.putPrivate(cfg.bucket, key, buffer, CV_MIME);
      return { key, prefix };
    } catch (err) {
      await this.deletePrivatePrefix(prefix);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Nie udało się wgrać pliku CV');
    }
  }

  /** Best-effort cleanup of all objects under a photo_key prefix (public bucket). */
  async deletePrefix(prefix: string): Promise<void> {
    const cfg = this.getPublicConfig();
    if (!cfg) {
      return;
    }
    await this.deletePrefixInBucket(this.getPublicClient(), cfg.bucket, prefix);
  }

  /** Best-effort cleanup under a CV prefix (private bucket). */
  async deletePrivatePrefix(prefix: string): Promise<void> {
    const cfg = this.getPrivateConfig();
    if (!cfg) {
      return;
    }
    await this.deletePrefixInBucket(
      this.getPrivateClient(),
      cfg.bucket,
      prefix
    );
  }

  private async deletePrefixInBucket(
    client: S3Client,
    bucket: string,
    prefix: string
  ): Promise<void> {
    try {
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        })
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k);
      if (!keys.length) {
        return;
      }
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    } catch {
      // best-effort
    }
  }

  private async putPublic(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.getPublicClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  }

  private async putPrivate(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.getPrivateClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      })
    );
  }
}
