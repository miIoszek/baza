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

const VARIANT_SIZES = [48, 96, 192, 512] as const;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PIXELS = 40_000_000; // ~6k x 6k

export type CompanyPhotoUrls = {
  original: string;
  s48: string;
  s96: string;
  s192: string;
  s512: string;
};

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;

  private getConfig() {
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

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }
    const cfg = this.getConfig();
    if (!cfg) {
      throw new ServiceUnavailableException('R2 is not configured');
    }
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    return this.client;
  }

  /**
   * Upload logo under a unique versioned prefix:
   * `companies/{companyId}/logos/{versionId}/…`
   * (legacy keys may still be `companies/{userId}/logo` or `…/logos/…` until replaced).
   */
  async uploadCompanyLogo(
    companyId: string,
    buffer: Buffer,
    claimedMime: string
  ): Promise<{ photoKey: string; photoUrls: CompanyPhotoUrls }> {
    const cfg = this.getConfig();
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
    const uploadedKeys: string[] = [];

    try {
      const ext =
        detectedMime === 'image/png'
          ? 'png'
          : detectedMime === 'image/webp'
            ? 'webp'
            : 'jpg';

      const originalKey = `${baseKey}/original.${ext}`;
      await this.put(cfg.bucket, originalKey, buffer, detectedMime);
      uploadedKeys.push(originalKey);

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
        await this.put(cfg.bucket, key, webp, 'image/webp');
        uploadedKeys.push(key);
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

  /** Best-effort cleanup of all objects under a photo_key prefix. */
  async deletePrefix(prefix: string): Promise<void> {
    const cfg = this.getConfig();
    if (!cfg) {
      return;
    }

    try {
      const listed = await this.getClient().send(
        new ListObjectsV2Command({
          Bucket: cfg.bucket,
          Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        })
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k);
      if (!keys.length) {
        return;
      }
      await this.getClient().send(
        new DeleteObjectsCommand({
          Bucket: cfg.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    } catch {
      // best-effort
    }
  }

  private async put(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Versioned keys are immutable; long cache is safe.
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  }
}
