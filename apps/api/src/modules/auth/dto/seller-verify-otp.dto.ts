import { IsString, Length, Matches } from 'class-validator';

export class SellerVerifyOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid Indian mobile number' })
  phone: string;

  @IsString()
  @Length(4, 6)
  otp: string;
}
