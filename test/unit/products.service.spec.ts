import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsRepository } from '../../src/products/repositories/products.repository';
import { ProductsService } from '../../src/products/products.service';

const mockProduct = {
  id: 'prod-uuid-1',
  name: 'Notebook Pro',
  description: 'Alta performance',
  category: 'electronics',
  price: '4999.99',
  stock: 10,
  imageUrl: null,
  imageKey: null,
  active: true,
  userId: 'user-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-uuid-1', name: 'Carlos', email: 'carlos@teste.com' },
};

const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};
const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockRepository },
        { provide: getQueueToken('product-processing'), useValue: mockQueue },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    const dto = { name: 'Notebook Pro', category: 'electronics', price: 4999.99 };

    it('should create a product and return it', async () => {
      mockRepository.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto as any, 'user-uuid-1');

      expect(result).toEqual(mockProduct);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should add a job to the queue after creation', async () => {
      mockRepository.create.mockResolvedValue(mockProduct);

      await service.create(dto as any, 'user-uuid-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'product.created',
        { productId: mockProduct.id, name: mockProduct.name, imageUrl: mockProduct.imageUrl },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
    });

    it('should invalidate cache after creation', async () => {
      mockRepository.create.mockResolvedValue(mockProduct);

      await service.create(dto as any, 'user-uuid-1');

      expect(mockCache.del).toHaveBeenCalledWith('products:user-uuid-1');
    });
  });

  describe('findAll', () => {
    const params = { userId: 'user-uuid-1', page: 1, limit: 10 };

    it('should return cached result when cache hits', async () => {
      const cached = { data: [mockProduct], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.findAll(params);

      expect(result).toEqual(cached);
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });

    it('should query repository and set cache on miss', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepository.findAll.mockResolvedValue({
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.findAll(params);

      expect(mockRepository.findAll).toHaveBeenCalledWith(params);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ meta: { total: 1, totalPages: 1 } });
    });
  });

  describe('findOne', () => {
    it('should return a product when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nao-existe', 'user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete product and invalidate cache', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.remove('prod-uuid-1', 'user-uuid-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('prod-uuid-1', 'user-uuid-1');
      expect(mockCache.del).toHaveBeenCalledWith('products:user-uuid-1');
    });

    it('should throw NotFoundException when trying to delete nonexistent product', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nao-existe', 'user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });
});
