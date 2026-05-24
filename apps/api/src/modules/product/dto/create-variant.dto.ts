import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  name: string; // e.g. "Red", "Large", "Red / Large"

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number; // override product price

  @IsOptional()
  @IsInt()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
