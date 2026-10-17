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
});

