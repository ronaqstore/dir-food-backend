import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class DeliveryAreaItemDto {
  @ApiProperty({
    example: '0192a000-0000-7000-8000-000000000001',
    description: 'Master platform Area ID',
  })
  @IsUUID('7', { message: 'areaId must be a valid UUID v7' })
  @IsNotEmpty()
  areaId!: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Delivery fee in paisa (Rs 100 = 10000). Set null for WhatsApp confirmation',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'deliveryFee must be greater than or equal to 0' })
  deliveryFee?: number | null;

  @ApiPropertyOptional({
    example: 80000,
    description: 'Minimum order amount in paisa for this area (Rs 800 = 80000). Set null to use restaurant default',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'minOrderAmount must be greater than or equal to 0' })
  minOrderAmount?: number | null;
}

export class UpdateDeliveryAreasDto {
  @ApiProperty({
    type: [DeliveryAreaItemDto],
    description: 'List of served delivery areas and their respective delivery fees',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaItemDto)
  areas!: DeliveryAreaItemDto[];
}
