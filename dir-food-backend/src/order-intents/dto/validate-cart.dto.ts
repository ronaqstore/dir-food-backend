import {
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ description: 'Menu Item UUID', example: '0192e4ab-1234-7000-8000-000000000001' })
  @IsUUID()
  menuItemId!: string;

  @ApiPropertyOptional({ description: 'Menu Item Variant UUID if applicable', example: '0192e4ab-1234-7000-8000-000000000002' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: 'Quantity (1-50)', example: 2 })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;
}

export class ValidateCartDto {
  @ApiProperty({ description: 'Restaurant slug', example: 'hotel-al-noor' })
  @IsString()
  restaurantSlug!: string;

  @ApiProperty({ description: 'Cart items', type: [CartItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @ApiPropertyOptional({ description: 'Selected delivery area UUID', example: '0192e4ab-1234-7000-8000-000000000003' })
  @IsOptional()
  @IsUUID()
  deliveryAreaId?: string;
}

