import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class OwnerLoginDto {
  @ApiProperty({ example: '03001234567', description: 'Restaurant owner mobile number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Phone must be a valid Pakistani mobile number',
  })
  phone!: string;

  @ApiProperty({ example: 'secret12345', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

