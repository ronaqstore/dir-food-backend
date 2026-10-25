import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class QueryPublicRestaurantsDto {
  @ApiPropertyOptional({
    description: 'Filter restaurants located in this City UUID',
    example: '01920000-0000-7000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('all', { message: 'cityId must be a valid UUID' })
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Filter restaurants serving this delivery area ID',
    example: '018f3a2b-0000-7000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('all', { message: 'areaId must be a valid UUID' })
  areaId?: string;

  @ApiPropertyOptional({
    description: 'Filter restaurants by cuisine name',
    example: 'Karahi',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'cuisine must not be empty' })
  cuisine?: string;

  @ApiPropertyOptional({
    description: 'Search restaurant by name (2 to 50 characters)',
    example: 'Al-Noor',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(50, { message: 'Search query must not exceed 50 characters' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter only restaurants currently open',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean({ message: 'openNow must be a boolean' })
  openNow?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit must not exceed 50' })
  limit?: number = 20;
}

