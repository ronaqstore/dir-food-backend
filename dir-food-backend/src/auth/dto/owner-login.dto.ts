import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class OwnerLoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+92|0092|92|0)?3\d{9}$/, {
    message: 'Phone must be a valid Pakistani mobile number',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

