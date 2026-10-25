import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminAreasController } from './platform-admin-areas.controller.js';
import { PlatformAdminAreasService } from '../services/platform-admin-areas.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('PlatformAdminAreasController (unit)', () => {
  let controller: PlatformAdminAreasController;
  let mockAreasService: any;

  beforeEach(() => {
    mockAreasService = {
      listAreas: vi.fn(),
      createArea: vi.fn(),
      updateArea: vi.fn(),
      deleteArea: vi.fn(),
      approveArea: vi.fn(),
      mergeArea: vi.fn(),
    };

    controller = new PlatformAdminAreasController(mockAreasService as PlatformAdminAreasService);
  });

  const mockAdminUser = {
    userId: 'admin-1',
    role: UserRole.PLATFORM_ADMIN,
    restaurantId: null,
  };

  it('delegates listAreas to service', async () => {
    const mockList = [{ id: 'a1', name: 'Timergara' }];
    mockAreasService.listAreas.mockResolvedValue(mockList);

    const result = await controller.listAreas();
    expect(mockAreasService.listAreas).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  it('delegates createArea to service', async () => {
    const dto = { name: 'Balambat', sortOrder: 2 };
    const mockCreated = { id: 'a2', name: 'Balambat' };
    mockAreasService.createArea.mockResolvedValue(mockCreated);

    const result = await controller.createArea(dto, mockAdminUser, '127.0.0.1');
    expect(mockAreasService.createArea).toHaveBeenCalledWith(dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockCreated);
  });

  it('delegates updateArea to service', async () => {
    const dto = { name: 'Balambat City', isActive: false };
    const mockUpdated = { id: 'a2', name: 'Balambat City' };
    mockAreasService.updateArea.mockResolvedValue(mockUpdated);

    const result = await controller.updateArea('a2', dto, mockAdminUser, '127.0.0.1');
    expect(mockAreasService.updateArea).toHaveBeenCalledWith('a2', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockUpdated);
  });

  it('delegates deleteArea to service', async () => {
    mockAreasService.deleteArea.mockResolvedValue({ success: true });

    const result = await controller.deleteArea('a2', mockAdminUser, '127.0.0.1');
    expect(mockAreasService.deleteArea).toHaveBeenCalledWith('a2', 'admin-1', '127.0.0.1');
    expect(result).toEqual({ success: true });
  });

  it('delegates approveArea to service', async () => {
    mockAreasService.approveArea.mockResolvedValue({ id: 'a2', isVerified: true });

    const result = await controller.approveArea('a2', {}, mockAdminUser, '127.0.0.1');
    expect(mockAreasService.approveArea).toHaveBeenCalledWith('a2', {}, 'admin-1', '127.0.0.1');
    expect(result).toEqual({ id: 'a2', isVerified: true });
  });

  it('delegates mergeArea to service', async () => {
    mockAreasService.mergeArea.mockResolvedValue({ success: true });

    const result = await controller.mergeArea('a2', { targetAreaId: 'a1' }, mockAdminUser, '127.0.0.1');
    expect(mockAreasService.mergeArea).toHaveBeenCalledWith('a2', 'a1', 'admin-1', '127.0.0.1');
    expect(result).toEqual({ success: true });
  });
});

