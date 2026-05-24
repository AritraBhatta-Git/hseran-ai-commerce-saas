import { Controller, Patch, Param, Body, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('Inventory')
@Controller('v1/seller/inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Patch(':productId')
updateStock(
  @Param('productId') productId: string,
  @Body() dto: UpdateStockDto,
) {
  return this.service.updateStock(
    productId,
    dto.stockQty,
    dto.reason, // ✅ now used
  );
} 

  @Get('logs/:productId')
  getLogs(@Param('productId') productId: string) {
    return this.service.getStockLogs(productId);
  }

}