import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RestaurantStatus } from '../../generated/prisma/enums.js';

export class UpdateRestaurantStatusDto {
  @ApiProperty({
    enum: RestaurantStatus,
    example: RestaurantStatus.ACTIVE,
    description: 'Target restaurant status (PENDING, ACTIVE, SUSPENDED, DEACTIVATED)',
  })
  @IsEnum(RestaurantStatus, {
    message: 'Status must be one of: PENDING, ACTIVE, SUSPENDED, DEACTIVATED',
  })
  status!: RestaurantStatus;

  @ApiPropertyOptional({
    example: 'Approved after verification of menu and delivery area',
    description: 'Mandatory reason when SUSPENDING or DEACTIVATING',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
