import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsArray,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  storeId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  // ✅ VERY IMPORTANT
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
