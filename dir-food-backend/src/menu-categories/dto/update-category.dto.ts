import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Shinwari Karahi', description: 'Updated category name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: true, description: 'Active toggle (soft delete)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
