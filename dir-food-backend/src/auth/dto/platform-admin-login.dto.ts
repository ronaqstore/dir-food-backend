import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PlatformAdminLoginDto {
  @ApiProperty({ example: '03009999999', description: 'Platform Admin mobile number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Phone must be a valid Pakistani mobile number',
  })
  phone!: string;

  @ApiProperty({ example: 'AdminPass123!', description: 'Platform Admin password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

