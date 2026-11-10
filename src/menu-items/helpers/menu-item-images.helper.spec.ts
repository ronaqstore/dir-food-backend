import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import {
  handleUploadItemImage,
  handleDeleteItemImage,
} from './menu-item-images.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ImageProcessorService,
  ProcessedImage,
} from '../../uploads/services/image-processor.service.js';
import type { R2StorageService } from '../../uploads/services/r2-storage.service.js';

describe('menu-item-images.helper', () => {
  it('throws NotFoundException when menu item is not found on upload', async () => {
    const mockPrisma = {
      menuItem: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const mockImageProcessor = {} as ImageProcessorService;
    const mockR2Storage = {} as R2StorageService;

    await expect(
      handleUploadItemImage(
        mockPrisma,
        mockImageProcessor,
        mockR2Storage,
        'rest-1',
        'item-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('uploads item image and deletes old image if present', async () => {
    const mockPrisma = {
      menuItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'item-1',
          imageUrl: 'https://cdn.example.com/old.jpg',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'item-1',
          imageUrl: 'https://cdn.example.com/new.webp',
        }),
      },
    } as unknown as PrismaService;

    const mockImageProcessor = {
      process: vi.fn().mockResolvedValue({
        buffer: Buffer.from('test'),
        ext: 'webp',
        contentType: 'image/webp',
      } as ProcessedImage),
    } as unknown as ImageProcessorService;

    const mockR2Storage = {
      put: vi.fn().mockResolvedValue('https://cdn.example.com/new.webp'),
      deleteByUrl: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2StorageService;

    const result = await handleUploadItemImage(
      mockPrisma,
      mockImageProcessor,
      mockR2Storage,
      'rest-1',
      'item-1',
    );

    expect(result).toEqual({
      id: 'item-1',
      imageUrl: 'https://cdn.example.com/new.webp',
    });
    expect(mockR2Storage.deleteByUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/old.jpg',
      'rest-1',
    );
  });

  it('deletes item image and clears R2 storage', async () => {
    const mockPrisma = {
      menuItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'item-1',
          imageUrl: 'https://cdn.example.com/old.jpg',
        }),
        update: vi.fn().mockResolvedValue({ id: 'item-1', imageUrl: null }),
      },
    } as unknown as PrismaService;

    const mockR2Storage = {
      deleteByUrl: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2StorageService;

    const result = await handleDeleteItemImage(
      mockPrisma,
      mockR2Storage,
      'rest-1',
      'item-1',
    );

    expect(result).toEqual({ id: 'item-1', imageUrl: null });
    expect(mockR2Storage.deleteByUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/old.jpg',
      'rest-1',
    );
  });
});
