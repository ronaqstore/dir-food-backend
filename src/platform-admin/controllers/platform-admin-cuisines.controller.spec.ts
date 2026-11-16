import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminCuisinesController } from './platform-admin-cuisines.controller.js';
import type { PlatformAdminCuisinesService } from '../services/platform-admin-cuisines.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

describe('PlatformAdminCuisinesController (unit)', () => {
  let controller: PlatformAdminCuisinesController;
  let mockService: any;
  const mockAdmin: AuthenticatedUser = {
    userId: 'admin-1',
    role: UserRole.PLATFORM_ADMIN,
    phone: '03001234567',
  };

  beforeEach(() => {
    mockService = {
      listCuisines: vi.fn(),
      createCuisine: vi.fn(),
      updateCuisine: vi.fn(),
      deleteCuisine: vi.fn(),
    };
    controller = new PlatformAdminCuisinesController(
      mockService as unknown as PlatformAdminCuisinesService,
    );
  });

  it('delegates listCuisines to service', async () => {
    mockService.listCuisines.mockResolvedValue({ data: [], meta: {} });
    const res = await controller.listCuisines({});
    expect(mockService.listCuisines).toHaveBeenCalledWith({});
    expect(res).toEqual({ data: [], meta: {} });
  });

  it('delegates createCuisine to service', async () => {
    const dto = { name: 'Fast Food' };
    mockService.createCuisine.mockResolvedValue({ id: 'c1', ...dto });
    const res = await controller.createCuisine(dto, mockAdmin, '127.0.0.1');
    expect(mockService.createCuisine).toHaveBeenCalledWith(
      dto,
      'admin-1',
      '127.0.0.1',
    );
    expect(res.id).toBe('c1');
  });

  it('delegates updateCuisine to service', async () => {
    const dto = { name: 'Fast Food' };
    mockService.updateCuisine.mockResolvedValue({ id: 'c1', ...dto });
    const res = await controller.updateCuisine(
      'c1',
      dto,
      mockAdmin,
      '127.0.0.1',
    );
    expect(mockService.updateCuisine).toHaveBeenCalledWith(
      'c1',
      dto,
      'admin-1',
      '127.0.0.1',
    );
    expect(res.id).toBe('c1');
  });

  it('delegates deleteCuisine to service', async () => {
    mockService.deleteCuisine.mockResolvedValue({ success: true });
    const res = await controller.deleteCuisine('c1', mockAdmin, '127.0.0.1');
    expect(mockService.deleteCuisine).toHaveBeenCalledWith(
      'c1',
      'admin-1',
      '127.0.0.1',
    );
    expect(res.success).toBe(true);
  });
});
