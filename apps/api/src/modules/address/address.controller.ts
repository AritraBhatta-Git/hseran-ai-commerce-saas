import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';
import { Patch } from '@nestjs/common';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Address')
@UseGuards(CustomerJwtGuard)
@Controller('v1/address')
export class AddressController {
  constructor(private readonly service: AddressService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.service.create(req.user.customerId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.customerId);
  }

  @Delete(':addressId')
  delete(@Req() req: any, @Param('addressId') addressId: string) {
    return this.service.delete(req.user.customerId, addressId);
  }

  @Patch(':addressId')
update(
  @Req() req: any,
  @Param('addressId') addressId: string,
  @Body() dto: UpdateAddressDto,
) {
  return this.service.update(req.user.customerId, addressId, dto);
}
}

