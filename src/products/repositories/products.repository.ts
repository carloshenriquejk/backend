import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface FindAllParams {
  userId: string;
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ProductsRepository {
  constructor(private prisma: PrismaService) {}

  private get select() {
    return {
      id: true,
      name: true,
      description: true,
      category: true,
      price: true,
      stock: true,
      imageUrl: true,
      imageKey: true,
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

  async findAll({ userId, category, page = 1, limit = 10, search }: FindAllParams) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      userId,
      active: true,
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take: limit,
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    return this.prisma.product.findFirst({ where: { id, userId }, select: this.select });
  }

  async update(id: string, userId: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id, userId }, data, select: this.select });
  }

  async delete(id: string, userId: string) {
    return this.prisma.product.delete({ where: { id, userId } });
  }
}
