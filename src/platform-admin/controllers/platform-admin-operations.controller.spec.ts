import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminOperationsController } from './platform-admin-operations.controller.js';
import { PlatformAdminOperationsService } from '../services/platform-admin-operations.service.js';

describe('PlatformAdminOperationsController (unit)', () => {
  let controller: PlatformAdminOperationsController;
  let mockOperationsService: any;

  beforeEach(() => {
    mockOperationsService = {
      searchOrderIntents: vi.fn(),
      getActivitySummary: vi.fn(),
      getAuditLogs: vi.fn(),
    };

    controller = new PlatformAdminOperationsController(
      mockOperationsService as PlatformAdminOperationsService,
    );
  });

  it('delegates searchOrderIntents to service', async () => {
    const query = { ref: 'TM-7K4P9Q' };
    const mockRes = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    mockOperationsService.searchOrderIntents.mockResolvedValue(mockRes);

    const result = await controller.searchOrderIntents(query);
    expect(mockOperationsService.searchOrderIntents).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockRes);
  });

  it('delegates getActivitySummary to service with range', async () => {
    const query = { range: '30d' };
    const mockRes = { range: '30d', restaurants: { total: 5 } };
    mockOperationsService.getActivitySummary.mockResolvedValue(mockRes);

    const result = await controller.getActivitySummary(query);
    expect(mockOperationsService.getActivitySummary).toHaveBeenCalledWith('30d');
    expect(result).toEqual(mockRes);
  });

  it('delegates getAuditLogs to service with query', async () => {
    const query = { restaurantId: 'r1', page: 1, limit: 10 };
    const mockRes = { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    mockOperationsService.getAuditLogs.mockResolvedValue(mockRes);

    const result = await controller.getAuditLogs(query);
    expect(mockOperationsService.getAuditLogs).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockRes);
  });
});

