import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CheckRestaurantNameDto {
  @ApiProperty({
    description: 'Restaurant name to check for slug availability',
    example: 'Royal Restaurant',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}

export interface CheckRestaurantNameResponse {
  available: boolean;
  baseSlug: string;
  suggestedSlug: string;
  collision: boolean;
  existingRestaurant?: {
    name: string;
    addressText?: string | null;
  };
}
