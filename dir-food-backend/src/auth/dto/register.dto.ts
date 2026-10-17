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
  @ApiProperty({ example: 'Hotel Al-Noor', description: 'Public restaurant name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  restaurantName!: string;

  @ApiProperty({ example: 'Ahmad Khan', description: 'Name of the restaurant owner' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  ownerName!: string;

  @ApiProperty({
    example: '03001234567',
    description: 'Owner Pakistani mobile phone number (03XXXXXXXXX or 923XXXXXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Owner phone must be a valid Pakistani mobile number (e.g. 03001234567 or 923001234567)',
  })
  phone!: string;

  @ApiProperty({ example: 'secret12345', description: 'Owner account password (min 8 chars)' })
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
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'WhatsApp number must be a valid Pakistani mobile number',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'Best traditional Karahi and Tikka in Timergara' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: ['Karahi', 'Fast Food', 'BBQ'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  cuisines?: string[];
}

