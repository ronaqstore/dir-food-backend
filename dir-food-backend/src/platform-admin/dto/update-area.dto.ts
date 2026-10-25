import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAreaDto {
  @ApiPropertyOptional({ example: '01920000-0000-7000-8000-000000000001', description: 'City/District UUID' })
  @IsOptional()
  @IsUUID('all')
  cityId?: string;

  @ApiPropertyOptional({ example: 'Timergara Central' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'timergara-central' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

