import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCuisinesController } from './public-cuisines.controller.js';
import type { PublicCuisinesService } from '../services/public-cuisines.service.js';

describe('PublicCuisinesController (unit)', () => {
  let controller: PublicCuisinesController;
  let mockService: {
    getCuisines: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      getCuisines: vi.fn(),
    };
    controller = new PublicCuisinesController(
      mockService as unknown as PublicCuisinesService,
    );
  });

  it('delegates getCuisines call to service', async () => {
    const cuisines = [
      {
        id: 'c-1',
        name: 'Fast Food',
        slug: 'fast-food',
        icon: null,
        sortOrder: 1,
      },
    ];
    mockService.getCuisines.mockResolvedValue(cuisines);

    const result = await controller.getCuisines();

    expect(mockService.getCuisines).toHaveBeenCalled();
    expect(result).toEqual(cuisines);
  });
});
