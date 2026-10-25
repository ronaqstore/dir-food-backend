import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RestaurantOwnerAdminInputDto {
  @ApiProperty({ example: 'Ahmad Khan' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '03001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class CreateRestaurantAdminDto {
  @ApiProperty({ example: 'Hotel Al-Noor' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '03001234567' })
  @IsString()
  @IsNotEmpty()
  contactPhone!: string;

  @ApiPropertyOptional({ example: '03007654321' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'College Chowk, Timergara' })
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional({ example: ['Karahi', 'Desi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisines?: string[];

  @ApiPropertyOptional({ example: 50000, description: 'Min order in paisa' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: '01920000-0000-7000-8000-000000000001', description: 'City/District UUID' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiProperty({ type: RestaurantOwnerAdminInputDto })
  @ValidateNested()
  @Type(() => RestaurantOwnerAdminInputDto)
  owner!: RestaurantOwnerAdminInputDto;
}

