import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApproveAreaDto {
  @ApiPropertyOptional({
    description: 'Optional cleaned up / corrected name for the area',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional cleaned up / corrected slug for the area',
    example: 'timergara',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;
}
