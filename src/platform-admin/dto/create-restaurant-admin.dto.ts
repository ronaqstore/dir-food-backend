import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
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
  @Matches(/^03\d{9}$/, {
    message:
      'Owner phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
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
  @Matches(/^03\d{9}$/, {
    message:
      'Contact phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
  contactPhone!: string;

  @ApiPropertyOptional({ example: '03007654321' })
  @IsOptional()
  @IsString()
  @Matches(/^03\d{9}$/, {
    message:
      'WhatsApp number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03007654321)',
  })
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

  @ApiPropertyOptional({
    example: '01920000-0000-7000-8000-000000000001',
    description: 'City/District UUID',
  })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiProperty({ type: RestaurantOwnerAdminInputDto })
  @ValidateNested()
  @Type(() => RestaurantOwnerAdminInputDto)
  owner!: RestaurantOwnerAdminInputDto;
}
