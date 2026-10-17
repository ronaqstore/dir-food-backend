import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  ext: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_DIMENSION_PX = 1600;
export const SUPPORTED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp']);

@Injectable()
export class ImageProcessorService {
  /**
   * Validates image by actual content (magic bytes/metadata), strips EXIF/GPS,
   * auto-rotates, and resizes to max 1600px without enlarging.
   */
  async process(file?: {
    buffer?: Buffer;
    size?: number;
    mimetype?: string;
  }): Promise<ProcessedImage> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image file is required');
    }

    if (file.buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image file size must not exceed 3 MB');
    }

    const sharpOptions = { limitInputPixels: 50_000_000 };

    let format: string | undefined;
    try {
      const metadata = await sharp(file.buffer, sharpOptions).metadata();
      format = metadata.format;
    } catch {
      throw new BadRequestException(
        'Invalid or corrupted image file. Supported formats: JPEG, PNG, WebP',
      );
    }

    if (
      !format ||
      !SUPPORTED_IMAGE_FORMATS.has(format)
    ) {
      throw new BadRequestException(
        'Unsupported image format. Allowed formats: JPEG, PNG, WebP',
      );
    }

    let processedBuffer: Buffer;
    try {
      const pipeline = sharp(file.buffer, sharpOptions)
        .rotate()
        .resize({
          width: MAX_DIMENSION_PX,
          height: MAX_DIMENSION_PX,
          fit: 'inside',
          withoutEnlargement: true,
        });

      if (format === 'jpeg') {
        processedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
        return {
          buffer: processedBuffer,
          ext: 'jpg',
          contentType: 'image/jpeg',
        };
      } else if (format === 'png') {
        processedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        return {
          buffer: processedBuffer,
          ext: 'png',
          contentType: 'image/png',
        };
      } else {
        processedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
        return {
          buffer: processedBuffer,
          ext: 'webp',
          contentType: 'image/webp',
        };
      }
    } catch {
      throw new BadRequestException('Failed to process image');
    }
  }
}
