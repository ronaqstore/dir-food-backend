import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCustomDeliveryAreaDto {
  @ApiProperty({
    example: 'Qambar',
    description: 'Name of the custom locality or neighborhood',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9\s/.,'()&-]+$/, {
    message: 'Area name contains invalid characters',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 10000,
    description:
      'Delivery fee in paisa (null for confirm on WhatsApp, 0 for free)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000000)
  deliveryFee?: number | null;

  @ApiPropertyOptional({
    example: 50000,
    description:
      'Minimum order amount in paisa for this area (null to use restaurant default)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50000000)
  minOrderAmount?: number | null;
}
