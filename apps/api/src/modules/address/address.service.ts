import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private db: PrismaService) {}

  async create(customerId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.db.prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return this.db.prisma.address.create({
      data: {
        ...dto,
        customerId,
      },
    });
  }

  async list(customerId: string) {
    return this.db.prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(customerId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.db.prisma.address.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault) {
      await this.db.prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return this.db.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async delete(customerId: string, addressId: string) {
    const address = await this.db.prisma.address.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return this.db.prisma.address.delete({
      where: { id: addressId },
    });
  }
}