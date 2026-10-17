import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class QueryActivityDto {
  @ApiPropertyOptional({ enum: ['7d', '30d'], default: '7d' })
  @IsOptional()
  @IsIn(['7d', '30d'])
  range?: string = '7d';
}

