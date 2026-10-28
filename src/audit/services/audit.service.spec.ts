import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';

describe('AuditService (unit)', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new AuditService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('successfully creates an audit log entry', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.log({
      actorUserId: 'user-1',
      restaurantId: 'rest-1',
      action: 'TEST_ACTION',
      entityType: 'restaurant',
      entityId: 'rest-1',
      details: { note: 'test' },
      ipAddress: '127.0.0.1',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        restaurantId: 'rest-1',
        action: 'TEST_ACTION',
        entityType: 'restaurant',
        entityId: 'rest-1',
        details: { note: 'test' },
        ipAddress: '127.0.0.1',
      },
    });
  });

  it('gracefully handles database errors without throwing', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB failure'));

    await expect(
      service.log({
        action: 'TEST_ACTION',
        entityType: 'restaurant',
      }),
    ).resolves.not.toThrow();
  });
});

