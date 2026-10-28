import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service.js';
import type { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';

describe('R2StorageService', () => {
  const makeConfig = (enabled: boolean): AppConfigurationService =>
    ({
      r2StorageEnabled: enabled,
      r2: {
        accountId: 'test-account-id',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        bucket: 'dir-food-test',
        publicUrlBase: 'https://images.dirfood.test',
      },
    }) as unknown as AppConfigurationService;

  describe('when R2 storage is disabled', () => {
    let service: R2StorageService;

    beforeEach(() => {
      service = new R2StorageService(makeConfig(false));
    });

    it('reports isEnabled as false', () => {
      expect(service.isEnabled).toBe(false);
    });

    it('throws ServiceUnavailableException when put is called', async () => {
      await expect(
        service.put('test-key.jpg', Buffer.from('test'), 'image/jpeg'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('no-ops when deleteByUrl is called without errors', async () => {
      await expect(
        service.deleteByUrl('https://images.dirfood.test/test.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  describe('when R2 storage is enabled', () => {
    let service: R2StorageService;
    let mockSend: any;

    beforeEach(() => {
      service = new R2StorageService(makeConfig(true));
      mockSend = vi.fn().mockResolvedValue({});
      (service as any).client = { send: mockSend };
    });

    it('reports isEnabled as true', () => {
      expect(service.isEnabled).toBe(true);
    });

    it('builds the correct public URL', () => {
      const url = service.buildPublicUrl(
        'restaurants/rest-1/profile/logo-123.jpg',
      );
      expect(url).toBe(
        'https://images.dirfood.test/restaurants/rest-1/profile/logo-123.jpg',
      );
    });

    it('sends PutObjectCommand and returns public URL on put', async () => {
      const key = 'restaurants/rest-1/profile/logo-123.jpg';
      const body = Buffer.from('dummy image buffer');
      const url = await service.put(key, body, 'image/jpeg');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input).toEqual({
        Bucket: 'dir-food-test',
        Key: key,
        Body: body,
        ContentType: 'image/jpeg',
      });
      expect(url).toBe(`https://images.dirfood.test/${key}`);
    });

    it('deletes object when URL belongs to this bucket', async () => {
      const url =
        'https://images.dirfood.test/restaurants/rest-1/profile/logo-123.jpg';
      await service.deleteByUrl(url);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0];
      expect(callArg.input).toEqual({
        Bucket: 'dir-food-test',
        Key: 'restaurants/rest-1/profile/logo-123.jpg',
      });
    });

    it('ignores URLs from other domains or invalid formats', async () => {
      await service.deleteByUrl('https://other-domain.com/some-image.jpg');
      await service.deleteByUrl(null);
      await service.deleteByUrl('');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('enforces tenant isolation: ignores deletion if key does not match restaurantId', async () => {
      const url =
        'https://images.dirfood.test/restaurants/rest-1/profile/logo-123.jpg';

      // Attempting to delete using restaurantId 'rest-2'
      await service.deleteByUrl(url, 'rest-2');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('allows deletion when key matches restaurantId', async () => {
      const url =
        'https://images.dirfood.test/restaurants/rest-1/profile/logo-123.jpg';

      await service.deleteByUrl(url, 'rest-1');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('absorbs S3 deletion errors safely without throwing', async () => {
      mockSend.mockRejectedValue(new Error('S3 network glitch'));
      const url =
        'https://images.dirfood.test/restaurants/rest-1/profile/logo-123.jpg';

      await expect(service.deleteByUrl(url)).resolves.toBeUndefined();
    });
  });
});
