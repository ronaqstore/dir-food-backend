import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderIntentStatus } from '../../generated/prisma/enums.js';

export class QueryOrderIntentsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Page size limit (max 50)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search by reference code (e.g. TM-7K4P9Q)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by intent status', enum: OrderIntentStatus })
  @IsOptional()
  @IsEnum(OrderIntentStatus)
  status?: OrderIntentStatus;
}

export class QueryStatsDto {
  @ApiPropertyOptional({ description: 'Date range filter: 7d or 30d', default: '7d' })
  @IsOptional()
  @IsString()
  range: string = '7d';
}

