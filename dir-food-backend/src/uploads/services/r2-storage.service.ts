import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrlBase: string;
  private readonly enabled: boolean;

  constructor(private readonly config: AppConfigurationService) {
    this.enabled = config.r2StorageEnabled;
    this.bucket = config.r2.bucket;
    this.publicUrlBase = config.r2.publicUrlBase;
    this.client = this.enabled
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.r2.accessKeyId,
            secretAccessKey: config.r2.secretAccessKey,
          },
        })
      : null;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Uploads an image buffer to Cloudflare R2 and returns its public HTTPS URL.
   * If R2 storage is disabled, throws ServiceUnavailableException.
   */
  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new ServiceUnavailableException(
        'Image uploads are disabled: Cloudflare R2 storage is not configured.',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return this.buildPublicUrl(key);
  }

  buildPublicUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }

  /**
   * Best-effort deletion of an image from Cloudflare R2.
   * If restaurantId is supplied, verifies that the key belongs to that restaurant before deleting.
   * Never throws: failure to delete an old or orphaned object is logged and ignored.
   */
  async deleteByUrl(url?: string | null, restaurantId?: string): Promise<void> {
    if (!this.enabled || !this.client || !this.publicUrlBase || !url) {
      return;
    }

    const prefix = `${this.publicUrlBase}/`;
    if (!url.startsWith(prefix)) {
      return;
    }

    const key = url.slice(prefix.length);
    if (!key) {
      return;
    }

    // Tenant isolation: if restaurantId is provided, ensure the key belongs to this restaurant
    if (restaurantId && !key.startsWith(`restaurants/${restaurantId}/`)) {
      this.logger.warn(
        `Cross-tenant image deletion rejected for key: ${key} by restaurant: ${restaurantId}`,
      );
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete R2 object for key: ${key}`, error);
    }
  }
}
