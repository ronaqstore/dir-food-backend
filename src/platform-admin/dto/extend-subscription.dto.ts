import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ExtendSubscriptionDto {
  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Explicit new subscription end timestamp (must be in future and > current end)',
  })
  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Number of days to add (1..366)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(366)
  addDays?: number;
}

