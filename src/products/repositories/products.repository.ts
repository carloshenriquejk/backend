import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private prisma: PrismaService) {}

  private get select() {
    return {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      imageUrl: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    } satisfies Prisma.ProductSelect;
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data, select: this.select });
  }

  async findAll(params: { skip: number; take: number; where?: Prisma.ProductWhereInput }) {
    const { skip, take, where } = params;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ skip, take, where, select: this.select, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({ where: { id }, select: this.select });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data, select: this.select });
  }

  async delete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
