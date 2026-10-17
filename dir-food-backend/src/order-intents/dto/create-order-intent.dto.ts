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
  Length,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemDto } from './validate-cart.dto.js';

export class CustomerDto {
  @ApiPropertyOptional({ description: 'Customer name (2-60 chars)', example: 'Ahmad Khan' })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;

  @ApiPropertyOptional({ description: 'Customer Pakistani mobile number', example: '03001234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class MapPinDto {
  @ApiProperty({ description: 'Latitude (-90 to 90)', example: 34.8265 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: 'Longitude (-180 to 180)', example: 71.8412 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class DeliveryDetailsDto {
  @ApiProperty({ description: 'Master delivery area UUID', example: '0192e4ab-1234-7000-8000-000000000003' })
  @IsUUID()
  areaId!: string;

  @ApiProperty({ description: 'Delivery landmark (3-150 chars)', example: 'Near Girls Degree College gate' })
  @IsString()
  @Length(3, 150)
  landmark!: string;

  @ApiPropertyOptional({ description: 'Additional directions (max 300 chars)', example: 'Blue gate, 2nd house on left' })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  directions?: string;

  @ApiPropertyOptional({ description: 'Map coordinates pin' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MapPinDto)
  mapPin?: MapPinDto;
}

export class CreateOrderIntentDto {
  @ApiProperty({ description: 'Client-generated idempotency UUID v4/v7', example: '6f0c1c4e-7d1e-4d2b-9a58-0c6a3f4b9b21' })
  @IsUUID()
  clientRequestId!: string;

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

  @ApiPropertyOptional({ description: 'Optional customer contact details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  @ApiProperty({ description: 'Delivery details' })
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  delivery!: DeliveryDetailsDto;

  @ApiProperty({ description: 'Expected subtotal in paisa reviewed by customer', example: 142000 })
  @IsInt()
  @Min(0)
  expectedSubtotal!: number;
}

