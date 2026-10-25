import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MergeAreaDto {
  @ApiProperty({ description: 'The official target Area UUID to merge into' })
  @IsUUID()
  @IsNotEmpty()
  targetAreaId!: string;
}

