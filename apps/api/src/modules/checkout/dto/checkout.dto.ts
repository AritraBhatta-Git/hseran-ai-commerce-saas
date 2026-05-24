import { IsString } from 'class-validator';

export class CheckoutDto {
  @IsString()
  storeId: string;

  @IsString()
  addressId: string;
}