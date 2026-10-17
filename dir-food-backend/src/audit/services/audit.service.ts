import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AuditLogParams {
  actorUserId?: string | null;
  restaurantId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? null,
          restaurantId: params.restaurantId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          details: (params.details as any) ?? null,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (error) {
      // Never crash critical operations if logging encounters an issue, but log error
      this.logger.error(
        `Failed to record audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}

