import { IsEmail } from 'class-validator';

export class SellerAddEmailDto {
  @IsEmail()
  email: string;
}
