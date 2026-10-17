import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 'Special Chicken Karahi' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Cooked with organic spices' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '0192a000-0000-7000-8000-000000000002', description: 'Move to another category' })
  @IsOptional()
  @IsUUID('7')
  categoryId?: string;

  @ApiPropertyOptional({ example: 130000, description: 'Base price in paisa or null if using variants', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number | null;

  @ApiPropertyOptional({ example: true, description: 'Daily availability toggle' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Active toggle (soft delete)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
