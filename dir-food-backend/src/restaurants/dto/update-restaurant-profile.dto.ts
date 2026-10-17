import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  ArrayMaxSize,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateRestaurantProfileDto {
  @ApiPropertyOptional({ example: 'Hotel Al-Noor', description: 'Restaurant name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Best traditional Karahi and BBQ in Timergara' })
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

  @ApiPropertyOptional({ example: 'Main Bazaar, Near College Chowk, Timergara' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressText?: string;

  @ApiPropertyOptional({ example: '03001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Contact phone must be a valid Pakistani mobile number',
  })
  contactPhone?: string;

  @ApiPropertyOptional({ example: '03007654321', description: 'WhatsApp number for orders' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'WhatsApp number must be a valid Pakistani mobile number',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Minimum order amount in paisa (Rs 500 = 50000)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;
}
