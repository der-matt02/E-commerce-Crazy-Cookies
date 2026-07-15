import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

jest.mock('fs');
jest.mock('fs/promises');

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    orderItem: {
      count: jest.fn(),
    },
    productImage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Galletas de Chocolate',
      slug: 'galletas-chocolate',
      description: 'Deliciosas galletas con chips de chocolate',
      price: 15000,
      categoryId: 'category-1',
      isActive: true,
      stockAvailable: 20,
      stockMinimum: 5,
    };

    it('should create a product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-1' });
      const createdProduct = { id: 'product-1', ...createDto };
      mockPrismaService.product.create.mockResolvedValue(createdProduct);

      const result = await service.create(createDto);

      expect(result).toEqual(createdProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.categoryId },
      });
      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createDto.name,
            slug: createDto.slug,
            inventory: {
              create: {
                stockAvailable: 20,
                stockReserved: 0,
                stockMinimum: 5,
              },
            },
          }),
          include: { category: true, inventory: true, images: true },
        }),
      );
    });

    it('should default stockAvailable to 0 and stockMinimum to 5 when not provided', async () => {
      const dtoWithoutStock: Partial<typeof createDto> = { ...createDto };
      delete dtoWithoutStock.stockAvailable;
      delete dtoWithoutStock.stockMinimum;
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-1' });
      mockPrismaService.product.create.mockResolvedValue({ id: 'product-1' });

      await service.create(dtoWithoutStock as typeof createDto);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventory: {
              create: {
                stockAvailable: 0,
                stockReserved: 0,
                stockMinimum: 5,
              },
            },
          }),
        }),
      );
    });

    it('should reject when slug already exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'existing',
        slug: createDto.slug,
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.category.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should reject when categoryId does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default page and limit', async () => {
      const mockProducts = [{ id: 'p1' }, { id: 'p2' }];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result).toEqual({
        products: mockProducts,
        pagination: {
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('should compute skip/take and hasNext/hasPrev correctly for a middle page', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(25);

      const result = await service.findAll(2, 10);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should return empty products array with correct pagination when no products exist', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.products).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });
  });

  describe('findByCategory', () => {
    it('should return a flat array of products for a category', async () => {
      const mockProducts = [{ id: 'p1', categoryId: 'cat-1' }];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findByCategory('cat-1');

      expect(result).toEqual(mockProducts);
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: 'cat-1' } }),
      );
    });

    it('should return an empty array when category has no products', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.findByCategory('empty-cat');

      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should apply text query filter on name and description', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.search({ query: 'chocolate' });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: [{ name: { contains: 'chocolate' } }, { description: { contains: 'chocolate' } }],
          }),
        }),
      );
    });

    it('should apply categoryId, price range and inStock filters combined', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.search({
        categoryId: 'cat-1',
        minPrice: 1000,
        maxPrice: 5000,
        inStock: true,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            price: { gte: 1000, lte: 5000 },
            inventory: { stockAvailable: { gt: 0 } },
          }),
        }),
      );
    });

    it('should not apply inStock filter when inStock is false', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.search({ inStock: false });

      const call = mockPrismaService.product.findMany.mock.calls[0][0];
      expect(call.where.inventory).toBeUndefined();
    });

    it.each([
      ['price_asc', { price: 'asc' }],
      ['price_desc', { price: 'desc' }],
      ['name', { name: 'asc' }],
      ['newest', { createdAt: 'desc' }],
    ] as const)('should sort by %s', async (sortBy, expectedOrderBy) => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.search({ sortBy });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expectedOrderBy }),
      );
    });

    it('should default to newest sort when sortBy is not provided', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      await service.search({});

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should paginate results using default page/limit', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(30);

      const result = await service.search({});

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 12 }),
      );
      expect(result.pagination).toEqual({
        total: 30,
        page: 1,
        limit: 12,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should paginate results using custom page/limit', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(30);

      await service.search({ page: 3, limit: 5 });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product including category, inventory, images and reviews', async () => {
      const mockProduct = { id: 'product-1', name: 'Galletas' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-1');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          include: expect.objectContaining({
            category: true,
            inventory: true,
            images: expect.any(Object),
            reviews: expect.any(Object),
            _count: expect.any(Object),
          }),
        }),
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Nuevo nombre' };

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new slug is already taken by another product', async () => {
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({ id: 'product-1' }) // findOne existence check
        .mockResolvedValueOnce({ id: 'other-product', slug: 'taken-slug' }); // slug check

      await expect(service.update('product-1', { slug: 'taken-slug' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should allow updating slug to the same value on the same product', async () => {
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({ id: 'product-1' })
        .mockResolvedValueOnce({ id: 'product-1', slug: 'same-slug' });

      const tx = {
        product: { update: jest.fn().mockResolvedValue({ id: 'product-1', slug: 'same-slug' }) },
        inventory: { update: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.update('product-1', { slug: 'same-slug' });

      expect(result).toEqual({ id: 'product-1', slug: 'same-slug' });
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating to a nonexistent categoryId', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce({ id: 'product-1' });
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update('product-1', { categoryId: 'missing-category' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should update product and inventory in a transaction when stock fields are provided', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce({ id: 'product-1' });

      const tx = {
        product: {
          update: jest.fn().mockResolvedValue({ id: 'product-1', name: 'Nuevo nombre' }),
        },
        inventory: { update: jest.fn().mockResolvedValue({}) },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.update('product-1', {
        name: 'Nuevo nombre',
        stockAvailable: 100,
        stockMinimum: 10,
      });

      expect(result).toEqual({ id: 'product-1', name: 'Nuevo nombre' });
      expect(tx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          data: { name: 'Nuevo nombre' },
        }),
      );
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        data: { stockAvailable: 100, stockMinimum: 10 },
      });
    });

    it('should not touch inventory when no stock fields are provided', async () => {
      mockPrismaService.product.findUnique.mockResolvedValueOnce({ id: 'product-1' });

      const tx = {
        product: { update: jest.fn().mockResolvedValue({ id: 'product-1' }) },
        inventory: { update: jest.fn() },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      await service.update('product-1', { name: 'Solo nombre' });

      expect(tx.inventory.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.delete).not.toHaveBeenCalled();
    });

    it('should reject deletion (ConflictException) when product has associated orderItems', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrismaService.orderItem.count.mockResolvedValue(3);

      await expect(service.remove('product-1')).rejects.toThrow(ConflictException);
      expect(mockPrismaService.product.delete).not.toHaveBeenCalled();
    });

    it('should hard delete the product when it has no associated orders', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrismaService.orderItem.count.mockResolvedValue(0);
      mockPrismaService.product.delete.mockResolvedValue({ id: 'product-1' });

      const result = await service.remove('product-1');

      expect(result).toEqual({ id: 'product-1' });
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({ where: { id: 'product-1' } });
    });
  });

  describe('getFeatured', () => {
    it('should return featured active in-stock products with default limit', async () => {
      const mockProducts = [{ id: 'p1' }];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getFeatured();

      expect(result).toEqual(mockProducts);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            inventory: { stockAvailable: { gt: 0 } },
          }),
          take: 8,
        }),
      );
    });

    it('should respect a custom limit', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.getFeatured(3);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  describe('addImage', () => {
    const file = {
      filename: 'abc123.jpg',
      originalname: 'cookie.jpg',
    } as Express.Multer.File;

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addImage('missing-id', file)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.productImage.create).not.toHaveBeenCalled();
    });

    it('should assign order 0 for the first image of a product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);
      mockPrismaService.productImage.create.mockResolvedValue({ id: 'img-1', order: 0 });

      const result = await service.addImage('product-1', file);

      expect(mockPrismaService.productImage.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          url: '/uploads/products/abc123.jpg',
          alt: 'cookie.jpg',
          order: 0,
        },
      });
      expect(result).toEqual({ id: 'img-1', order: 0 });
    });

    it('should increment order based on the last existing image', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrismaService.productImage.findFirst.mockResolvedValue({ order: 4 });
      mockPrismaService.productImage.create.mockResolvedValue({ id: 'img-2', order: 5 });

      await service.addImage('product-1', file);

      expect(mockPrismaService.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 5 }) }),
      );
    });
  });

  describe('removeImage', () => {
    it('should throw NotFoundException when image does not exist for the product', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);

      await expect(service.removeImage('product-1', 'image-1')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.productImage.delete).not.toHaveBeenCalled();
    });

    it('should delete the file from disk and the DB record when file exists', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue({
        id: 'image-1',
        productId: 'product-1',
        url: '/uploads/products/abc123.jpg',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fsPromises.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrismaService.productImage.delete.mockResolvedValue({});

      await service.removeImage('product-1', 'image-1');

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(mockPrismaService.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('should skip unlink when the file does not exist on disk but still delete DB record', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue({
        id: 'image-1',
        productId: 'product-1',
        url: '/uploads/products/missing.jpg',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPrismaService.productImage.delete.mockResolvedValue({});

      await service.removeImage('product-1', 'image-1');

      expect(fsPromises.unlink).not.toHaveBeenCalled();
      expect(mockPrismaService.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('should reject path traversal attempts with BadRequestException', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue({
        id: 'image-1',
        productId: 'product-1',
        url: '/../../etc/passwd',
      });

      await expect(service.removeImage('product-1', 'image-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.productImage.delete).not.toHaveBeenCalled();
    });
  });
});
