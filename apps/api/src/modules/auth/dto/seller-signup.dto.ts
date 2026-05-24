import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SellerSignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phone: string;
}
