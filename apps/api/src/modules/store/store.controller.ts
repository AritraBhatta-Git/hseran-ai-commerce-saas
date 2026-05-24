import {
  Controller,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';
import { StoreService } from './store.service';
import { UpdateStoreDto } from './dto/update-store.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Store')
@ApiBearerAuth('access-token')
@Controller('v1/store')
@UseGuards(SellerJwtGuard)
export class StoreController {
  constructor(private service: StoreService) {}

  // ======================================================
  // UPDATE STORE
  // ======================================================

  @Patch(':storeId')
  updateStore(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.service.updateStore(
      req.user.sellerId,
      storeId,
      dto,
    );
  }

  // ======================================================
  // LOGO UPLOAD
  // ======================================================

  @Post('upload-logo/:storeId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/stores',
        filename: (_, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadLogo(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.service.updateStore(req.user.sellerId, storeId, {
      logoUrl: `/uploads/stores/${file.filename}`,
    });
  }

  // ======================================================
  // BANNER UPLOAD
  // ======================================================

  @Post('upload-banner/:storeId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/stores',
        filename: (_, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadBanner(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.service.updateStore(req.user.sellerId, storeId, {
      bannerUrl: `/uploads/stores/${file.filename}`,
    });
  }
}