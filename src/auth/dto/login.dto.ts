import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^03\d{9}$/, {
    message:
      'Phone must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
