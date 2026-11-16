import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class RegisterRestaurantDto {
  @ApiProperty({
    example: 'Hotel Al-Noor',
    description: 'Public restaurant name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  restaurantName!: string;

  @ApiProperty({
    example: 'Ahmad Khan',
    description: 'Name of the restaurant owner',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  ownerName!: string;

  @ApiProperty({
    example: '03001234567',
    description: 'Owner Pakistani mobile phone number (03XXXXXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^03\d{9}$/, {
    message:
      'Owner phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
  phone!: string;

  @ApiProperty({
    example: 'secret12345',
    description: 'Owner account password (min 8 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiPropertyOptional({
    example: '03007654321',
    description: 'Restaurant WhatsApp number for receiving food orders',
  })
  @IsOptional()
  @IsString()
  @Matches(/^03\d{9}$/, {
    message:
      'WhatsApp number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03007654321)',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: 'Best traditional Karahi and Tikka in Timergara',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: ['Karahi', 'Fast Food', 'BBQ'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  cuisines?: string[];

  @ApiPropertyOptional({
    example: '01920000-0000-7000-8000-000000000001',
    description: 'City/District UUID',
  })
  @IsOptional()
  @IsString()
  cityId?: string;
}
