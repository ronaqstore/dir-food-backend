import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
