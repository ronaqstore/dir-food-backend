import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCitiesController } from './public-cities.controller.js';
import type { PublicCitiesService } from '../services/public-cities.service.js';

describe('PublicCitiesController (unit)', () => {
  let controller: PublicCitiesController;
  let mockService: {
    getCities: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      getCities: vi.fn(),
    };
    controller = new PublicCitiesController(
      mockService as unknown as PublicCitiesService,
    );
  });

  it('delegates getCities call to service', async () => {
    const cities = [{ id: 'city-1', name: 'Lower Dir', slug: 'lower-dir', sortOrder: 1 }];
    mockService.getCities.mockResolvedValue(cities);

    const result = await controller.getCities();

    expect(mockService.getCities).toHaveBeenCalled();
    expect(result).toEqual(cities);
  });
});

