import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateRestaurantAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisines?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional({ example: '03001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^03\d{9}$/, {
    message:
      'Contact phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
  contactPhone?: string;

  @ApiPropertyOptional({ example: '03007654321' })
  @IsOptional()
  @IsString()
  @Matches(/^03\d{9}$/, {
    message:
      'WhatsApp number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03007654321)',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({
    description: 'Internal administrative / support notes',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
