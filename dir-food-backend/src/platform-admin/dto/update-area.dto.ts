import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateAreaDto {
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

