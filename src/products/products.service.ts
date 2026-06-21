import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindAllParams, ProductsRepository } from './repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private repository: ProductsRepository,
    @InjectQueue('product-processing') private productQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateProductDto, userId: string, imageUrl?: string, imageKey?: string) {
    const product = await this.repository.create({
      ...dto,
      price: dto.price,
      imageUrl,
      imageKey,
      user: { connect: { id: userId } },
    });

    await this.productQueue.add(
      'product.created',
      { productId: product.id, name: product.name, imageUrl: product.imageUrl },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    await this.invalidateCache(userId);
    return product;
  }

  async findAll(params: FindAllParams) {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const { data, total, page, limit } = await this.repository.findAll(params);
    const result = {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async findOne(id: string, userId: string) {
    const product = await this.repository.findOne(id, userId);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    await this.findOne(id, userId);
    const product = await this.repository.update(id, userId, dto);
    await this.invalidateCache(userId);
    return product;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.repository.delete(id, userId);
    await this.invalidateCache(userId);
  }

  private buildCacheKey(params: FindAllParams): string {
    return `products:${params.userId}:${params.category ?? ''}:${params.page ?? 1}:${params.limit ?? 10}:${params.search ?? ''}`;
  }

  private async invalidateCache(userId: string): Promise<void> {
    await this.cacheManager.del(`products:${userId}`);
  }
}
