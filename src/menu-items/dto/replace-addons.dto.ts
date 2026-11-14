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

export class AddonItemDto {
  @ApiPropertyOptional({
    example: '0192a000-0000-7000-8000-000000000099',
    description: 'Existing addon ID',
  })
  @IsOptional()
  @IsUUID('7')
  id?: string;

  @ApiProperty({ example: 'Extra Cheese', description: 'Add-on name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: 5000, description: 'Price in paisa' })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceAddonsDto {
  @ApiProperty({
    type: [AddonItemDto],
    description: 'Full set of add-ons for the item',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AddonItemDto)
  addons!: AddonItemDto[];
}

