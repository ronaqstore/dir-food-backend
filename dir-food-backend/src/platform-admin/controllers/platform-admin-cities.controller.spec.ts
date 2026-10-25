import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminCitiesController } from './platform-admin-cities.controller.js';
import { PlatformAdminCitiesService } from '../services/platform-admin-cities.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('PlatformAdminCitiesController (unit)', () => {
  let controller: PlatformAdminCitiesController;
  let mockCitiesService: any;

  beforeEach(() => {
    mockCitiesService = {
      listCities: vi.fn(),
      createCity: vi.fn(),
      updateCity: vi.fn(),
    };

    controller = new PlatformAdminCitiesController(mockCitiesService as PlatformAdminCitiesService);
  });

  const mockAdminUser = {
    userId: 'admin-1',
    role: UserRole.PLATFORM_ADMIN,
    restaurantId: null,
  };

  it('delegates listCities to service', async () => {
    const mockList = [{ id: 'c1', name: 'Lower Dir' }];
    mockCitiesService.listCities.mockResolvedValue(mockList);

    const result = await controller.listCities();
    expect(mockCitiesService.listCities).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  it('delegates createCity to service', async () => {
    const dto = { name: 'Swat', sortOrder: 2 };
    const mockCreated = { id: 'c2', name: 'Swat' };
    mockCitiesService.createCity.mockResolvedValue(mockCreated);

    const result = await controller.createCity(dto, mockAdminUser, '127.0.0.1');
    expect(mockCitiesService.createCity).toHaveBeenCalledWith(dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockCreated);
  });

  it('delegates updateCity to service', async () => {
    const dto = { name: 'Swat Valley' };
    const mockUpdated = { id: 'c2', name: 'Swat Valley' };
    mockCitiesService.updateCity.mockResolvedValue(mockUpdated);

    const result = await controller.updateCity('c2', dto, mockAdminUser, '127.0.0.1');
    expect(mockCitiesService.updateCity).toHaveBeenCalledWith('c2', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockUpdated);
  });
});
