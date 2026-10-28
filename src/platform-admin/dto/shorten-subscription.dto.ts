import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ShortenSubscriptionDto {
  @ApiProperty({
    example: '2026-11-01T00:00:00.000Z',
    description: 'Earlier subscription end date (must be < current end and >= trialStartedAt)',
  })
  @IsDateString()
  subscriptionEndsAt!: string;

  @ApiProperty({
    example: 'Correcting input error on subscription duration',
    description: 'Mandatory non-empty reason for shortening',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({
    example: true,
    description: 'Must be explicitly true to confirm destructive shortening',
  })
  @Equals(true, { message: 'confirm must be explicitly true' })
  confirm!: boolean;
}

