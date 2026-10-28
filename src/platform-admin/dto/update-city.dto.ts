import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateCityDto {
  @ApiPropertyOptional({ example: 'Swat Valley' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'swat-valley' })
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
