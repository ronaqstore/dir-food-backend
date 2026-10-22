import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateItemVariantDto {
  @ApiProperty({ example: 'Half', description: 'Variant size name (e.g. Half, Full, Small, Large)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: 60000, description: 'Price in paisa (Rs 600 = 60000)' })
  @IsInt()
  @Min(0, { message: 'Variant price must be greater than or equal to 0' })
  price!: number;
}

export class CreateMenuItemDto {
  @ApiPropertyOptional({
    example: '0192a000-0000-7000-8000-000000000001',
    description: 'Category UUID v7. Optional for deals (auto-assigned to Deals & Combos).',
  })
  @IsOptional()
  @IsUUID('7', { message: 'categoryId must be a valid UUID v7' })
  categoryId?: string;

  @ApiProperty({ example: 'Chicken Karahi', description: 'Menu item name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Fresh desi ghee chicken karahi cooked in iron wok' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 120000,
    description: 'Base price in paisa (Rs 1,200 = 120000). Optional if variants are defined.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Original strikethrough price in paisa (Rs 1,500 = 150000) before deal discount',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  originalPrice?: number | null;

  @ApiPropertyOptional({ example: false, description: 'Mark item as a featured deal' })
  @IsOptional()
  @IsBoolean()
  isDeal?: boolean;

  @ApiPropertyOptional({ type: [CreateItemVariantDto], description: 'Optional size variants' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateItemVariantDto)
  variants?: CreateItemVariantDto[];
}
