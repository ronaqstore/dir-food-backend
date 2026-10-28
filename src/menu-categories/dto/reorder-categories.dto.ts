import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderCategoriesDto {
  @ApiProperty({
    example: [
      '0192a000-0000-7000-8000-000000000001',
      '0192a000-0000-7000-8000-000000000002',
    ],
    description: 'Ordered list of category IDs reflecting desired display sequence',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('7', { each: true, message: 'Each category ID must be a valid UUID v7' })
  ids!: string[];
}
