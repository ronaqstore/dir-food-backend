import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAreaDto {
  @ApiPropertyOptional({ example: '01920000-0000-7000-8000-000000000001', description: 'City/District UUID' })
  @IsOptional()
  @IsUUID('all')
  cityId?: string;

  @ApiProperty({ example: 'Timergara' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'timergara' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

