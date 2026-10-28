import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ManualStatus } from '../../generated/prisma/enums.js';

export class UpdateAvailabilityDto {
  @ApiProperty({
    enum: ManualStatus,
    example: ManualStatus.AUTO,
    description: 'Manual availability override: AUTO (follows hours), CLOSED, TEMP_UNAVAILABLE',
  })
  @IsEnum(ManualStatus, {
    message: 'Manual status must be one of: AUTO, CLOSED, TEMP_UNAVAILABLE',
  })
  manualStatus!: ManualStatus;

  @ApiPropertyOptional({
    example: 'Gas load-shedding until 4 PM',
    description: 'Optional public note explaining temporary unavailability',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  unavailableNote?: string;
}
