import { IsString, IsInt, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId: string;

  @IsString()
  storeId: string;

  @IsInt()
  quantity: number;

  @IsOptional()
  @IsString()
  variantId?: string; // ✅ ADD THIS
}