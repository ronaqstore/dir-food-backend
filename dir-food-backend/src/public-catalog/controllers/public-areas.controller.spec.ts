import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicAreasController } from './public-areas.controller.js';
import type { PublicAreasService } from '../services/public-areas.service.js';

describe('PublicAreasController', () => {
  let controller: PublicAreasController;
  let mockService: {
    getAreas: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      getAreas: vi.fn(),
    };
    controller = new PublicAreasController(
      mockService as unknown as PublicAreasService,
    );
  });

  it('delegates getAreas to PublicAreasService', async () => {
    const areas = [{ id: 'area-1', name: 'Timergara', slug: 'timergara' }];
    mockService.getAreas.mockResolvedValue(areas);

    const result = await controller.getAreas();

    expect(mockService.getAreas).toHaveBeenCalled();
    expect(result).toEqual(areas);
  });
});

