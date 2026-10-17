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
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  restaurantName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Owner phone must be a valid Pakistani mobile number (e.g. 03001234567 or 923001234567)',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'WhatsApp number must be a valid Pakistani mobile number',
  })
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  cuisines?: string[];
}

