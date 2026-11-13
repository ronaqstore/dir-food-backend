import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RestaurantStatus } from '../../generated/prisma/enums.js';

export class QueryRestaurantsDto {
  @ApiPropertyOptional({ enum: RestaurantStatus })
  @IsOptional()
  @IsEnum(RestaurantStatus)
  status?: RestaurantStatus;

  @ApiPropertyOptional({
    description: 'Subscription status filter: TRIAL, ACTIVE, EXPIRING, EXPIRED',
  })
  @IsOptional()
  @IsString()
  subStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by city / district UUID',
  })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Search term by name, slug, or contact phone',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Sort column (e.g. name, createdAt, status, subscriptionEndsAt)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description:
      'Combined sort string from data table (e.g. name.asc or createdAt.desc)',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
