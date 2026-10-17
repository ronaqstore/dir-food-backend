import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class ReorderMenuItemsDto {
  @ApiProperty({ example: '0192a000-0000-7000-8000-000000000001', description: 'Category ID' })
  @IsUUID('7')
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({
    example: [
      '0192a000-0000-7000-8000-000000000010',
      '0192a000-0000-7000-8000-000000000020',
    ],
    description: 'Ordered list of item IDs',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('7', { each: true })
  ids!: string[];
}
