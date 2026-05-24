import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('v1/ai')
@UseGuards(SellerJwtGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('generate-title')
  generateTitle(
    @Body()
    body: {
      name?: string;
      category?: string;
      keywords?: string;
      language?: string;
    },
  ) {
    return this.aiService.generateTitle(body);
  }

  @Post('generate-description')
  generateDescription(
    @Body()
    body: {
      name?: string;
      category?: string;
      keywords?: string;
      language?: string;
      tone?: string;
    },
  ) {
    return this.aiService.generateDescription(body);
  }

  @Post('generate-seo')
  generateSeo(
    @Body()
    body: {
      name?: string;
      category?: string;
      keywords?: string;
    },
  ) {
    return this.aiService.generateSeoContent(body);
  }
}
