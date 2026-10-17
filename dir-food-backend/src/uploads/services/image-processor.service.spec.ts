import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  ImageProcessorService,
  MAX_IMAGE_BYTES,
} from './image-processor.service.js';

describe('ImageProcessorService', () => {
  const service = new ImageProcessorService();

  const makeValidImage = async (
    format: 'jpeg' | 'png' | 'webp',
    width = 100,
    height = 100,
  ): Promise<Buffer> => {
    const s = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    });

    if (format === 'jpeg') return s.jpeg().toBuffer();
    if (format === 'png') return s.png().toBuffer();
    return s.webp().toBuffer();
  };

  it('rejects missing or empty file', async () => {
    await expect(service.process(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.process({ buffer: Buffer.alloc(0) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files larger than 3 MB', async () => {
    const hugeBuffer = Buffer.alloc(MAX_IMAGE_BYTES + 10);
    await expect(
      service.process({ buffer: hugeBuffer }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects disguised text files pretending to be images', async () => {
    const fakeBuffer = Buffer.from('This is a text file, not an image');
    await expect(
      service.process({ buffer: fakeBuffer }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported image formats (e.g. SVG or GIF)', async () => {
    const gifBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .gif()
      .toBuffer();

    await expect(
      service.process({ buffer: gifBuffer }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processes valid JPEG image and returns metadata', async () => {
    const jpegBuffer = await makeValidImage('jpeg', 200, 200);
    const result = await service.process({ buffer: jpegBuffer });

    expect(result.ext).toBe('jpg');
    expect(result.contentType).toBe('image/jpeg');
    expect(result.buffer).toBeInstanceOf(Buffer);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });

  it('processes valid PNG image and returns metadata', async () => {
    const pngBuffer = await makeValidImage('png', 150, 150);
    const result = await service.process({ buffer: pngBuffer });

    expect(result.ext).toBe('png');
    expect(result.contentType).toBe('image/png');

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('png');
  });

  it('processes valid WebP image and returns metadata', async () => {
    const webpBuffer = await makeValidImage('webp', 120, 120);
    const result = await service.process({ buffer: webpBuffer });

    expect(result.ext).toBe('webp');
    expect(result.contentType).toBe('image/webp');

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
  });

  it('resizes large image down to max dimension without enlarging small image', async () => {
    // 1. Large image: 2400 x 1200
    const largeBuffer = await makeValidImage('jpeg', 2400, 1200);
    const largeResult = await service.process({ buffer: largeBuffer });
    const largeMeta = await sharp(largeResult.buffer).metadata();

    expect(largeMeta.width).toBe(1600);
    expect(largeMeta.height).toBe(800);

    // 2. Small image: 400 x 300 should not be enlarged
    const smallBuffer = await makeValidImage('jpeg', 400, 300);
    const smallResult = await service.process({ buffer: smallBuffer });
    const smallMeta = await sharp(smallResult.buffer).metadata();

    expect(smallMeta.width).toBe(400);
    expect(smallMeta.height).toBe(300);
  });

  it('strips EXIF metadata from processed images', async () => {
    // Sharp re-encoding without .withMetadata() strips all EXIF/GPS
    const baseBuffer = await makeValidImage('jpeg', 100, 100);
    const result = await service.process({ buffer: baseBuffer });
    const meta = await sharp(result.buffer).metadata();

    expect(meta.exif).toBeUndefined();
  });
});
