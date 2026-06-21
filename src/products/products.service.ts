import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginateProductsDto } from './dto/paginate-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(private repository: ProductsRepository) {}

  create(dto: CreateProductDto, userId: string) {
    return this.repository.create({
      ...dto,
      price: dto.price,
      user: { connect: { id: userId } },
    });
  }

  async findAll(query: PaginateProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ],
          active: true,
        }
      : { active: true };

    const { data, total } = await this.repository.findAll({ skip, take: limit, where });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.repository.findOne(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const product = await this.findOne(id);
    if (product.userId !== userId) throw new ForbiddenException('You can only edit your own products');
    return this.repository.update(id, dto);
  }

  async remove(id: string, userId: string) {
    const product = await this.findOne(id);
    if (product.userId !== userId) throw new ForbiddenException('You can only delete your own products');
    await this.repository.delete(id);
  }
}
