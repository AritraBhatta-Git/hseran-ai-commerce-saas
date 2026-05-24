import { IsString, Matches } from 'class-validator';

export class SellerSendOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid Indian mobile number' })
  phone: string;
}
