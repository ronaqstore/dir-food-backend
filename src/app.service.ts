import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{ status: string; database: string }> {
    if (this.prisma) {
      await this.prisma.$queryRaw`SELECT 1`;
    }
    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
