import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SellerGoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  googleId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  idToken?: string;
}
