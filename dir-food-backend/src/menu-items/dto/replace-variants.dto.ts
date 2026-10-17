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

export class VariantItemDto {
  @ApiPropertyOptional({ example: '0192a000-0000-7000-8000-000000000099', description: 'Existing variant ID' })
  @IsOptional()
  @IsUUID('7')
  id?: string;

  @ApiProperty({ example: 'Full', description: 'Variant size name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: 120000, description: 'Price in paisa' })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceVariantsDto {
  @ApiProperty({ type: [VariantItemDto], description: 'Full set of variants for the item' })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => VariantItemDto)
  variants!: VariantItemDto[];
}
