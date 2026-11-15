import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class OwnerLoginDto {
  @ApiProperty({
    example: '03001234567',
    description: 'Restaurant owner mobile number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^03\d{9}$/, {
    message:
      'Phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
  phone!: string;

  @ApiProperty({ example: 'secret12345', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
