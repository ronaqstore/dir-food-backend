import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RestaurantStatus } from '../../generated/prisma/enums.js';

export class UpdateRestaurantStatusDto {
  @IsEnum(RestaurantStatus, {
    message: 'Status must be one of: PENDING, ACTIVE, SUSPENDED, DEACTIVATED',
  })
  status!: RestaurantStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
