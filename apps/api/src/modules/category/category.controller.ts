import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Category')
@ApiBearerAuth('access-token')
@Controller('v1/category')
@UseGuards(SellerJwtGuard)
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Post(':storeId')
  create(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.createCategory(
      req.user.sellerId,
      storeId,
      dto.name,
    );
  }

  @Get(':storeId')
  getAll(@Req() req: any, @Param('storeId') storeId: string) {
    return this.categoryService.getCategories(
      req.user.sellerId,
      storeId,
    );
  }

  @Patch(':storeId/:categoryId')
  update(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory(
      req.user.sellerId,
      storeId,
      categoryId,
      dto.name!,
    );
  }

  @Delete(':storeId/:categoryId')
  delete(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoryService.deleteCategory(
      req.user.sellerId,
      storeId,
      categoryId,
    );
  }
}
