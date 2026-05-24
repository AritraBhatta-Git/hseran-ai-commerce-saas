import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GoogleLoginDto {
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
