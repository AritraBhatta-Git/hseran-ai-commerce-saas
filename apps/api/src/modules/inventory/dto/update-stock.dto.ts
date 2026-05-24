import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  stockQty: number;

  @IsOptional()
  @IsString()
  reason?: string; // ✅ optional (no breaking)
}