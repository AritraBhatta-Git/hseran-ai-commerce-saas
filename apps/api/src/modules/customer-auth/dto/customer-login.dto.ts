import { IsEmail, IsString } from 'class-validator';

export class CustomerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}