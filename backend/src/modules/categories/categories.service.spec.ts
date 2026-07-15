import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCategoryDto = {
      name: 'Galletas',
      slug: 'galletas',
      order: 3,
    };

    it('should create a category when slug and name are free', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null); // slug check
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null); // name check
      const created = { id: 'cat-1', ...dto };
      mockPrismaService.category.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(mockPrismaService.category.findUnique).toHaveBeenNthCalledWith(1, {
        where: { slug: dto.slug },
      });
      expect(mockPrismaService.category.findUnique).toHaveBeenNthCalledWith(2, {
        where: { name: dto.name },
      });
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should preserve numeric order field when creating', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.category.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'cat-1', ...data }),
      );

      const result = await service.create({ ...dto, order: 7 });

      expect(result.order).toBe(7);
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 7 }),
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce({
        id: 'existing-1',
        slug: 'galletas',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.category.create).not.toHaveBeenCalled();
      // name check should not run once slug conflict is found
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when name already exists but slug is free', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null); // slug free
      mockPrismaService.category.findUnique.mockResolvedValueOnce({
        id: 'existing-2',
        name: 'Galletas',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.category.create).not.toHaveBeenCalled();
    });

    it('should reject an empty name at DTO validation level', async () => {
      const invalid = plainToInstance(CreateCategoryDto, { name: '', slug: 'galletas' });
      const errors = await validate(invalid);

      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.constraints).toHaveProperty('minLength');
    });

    it('should reject a missing/undefined name at DTO validation level', async () => {
      const invalid = plainToInstance(CreateCategoryDto, { slug: 'galletas' });
      const errors = await validate(invalid);

      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all categories ordered by "order" with product counts', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Galletas', order: 0, _count: { products: 5 } },
        { id: 'cat-2', name: 'Postres', order: 1, _count: { products: 0 } },
      ];
      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
    });

    it('should return an empty array when there are no categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const mockCategory = { id: 'cat-1', name: 'Galletas', _count: { products: 2 } };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null); // findOne check

      await expect(service.update('missing-id', { name: 'Nuevo' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.category.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new slug is already taken by another category', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Galletas', slug: 'galletas' }) // findOne
        .mockResolvedValueOnce({ id: 'cat-2', slug: 'nuevo-slug' }); // slug conflict check

      await expect(service.update('cat-1', { slug: 'nuevo-slug' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.category.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new name is already taken by another category', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Galletas', slug: 'galletas' }) // findOne
        .mockResolvedValueOnce({ id: 'cat-2', name: 'Postres' }); // name conflict check

      await expect(service.update('cat-1', { name: 'Postres' })).rejects.toThrow(ConflictException);
      expect(mockPrismaService.category.update).not.toHaveBeenCalled();
    });

    it('should allow updating a category to keep its own slug (no self-conflict)', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Galletas', slug: 'galletas' }) // findOne
        .mockResolvedValueOnce({ id: 'cat-1', slug: 'galletas' }); // slug belongs to itself
      const updated = { id: 'cat-1', name: 'Galletas', slug: 'galletas', description: 'Nuevo' };
      mockPrismaService.category.update.mockResolvedValue(updated);

      const result = await service.update('cat-1', {
        slug: 'galletas',
        description: 'Nuevo',
      });

      expect(result).toEqual(updated);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { slug: 'galletas', description: 'Nuevo' },
      });
    });

    it('should update a category successfully when there are no conflicts', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Galletas',
        slug: 'galletas',
      }); // findOne only, no slug/name change requested
      const updated = { id: 'cat-1', name: 'Galletas', slug: 'galletas', isActive: false };
      mockPrismaService.category.update.mockResolvedValue(updated);

      const result = await service.update('cat-1', { isActive: false });

      expect(result).toEqual(updated);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.count).not.toHaveBeenCalled();
      expect(mockPrismaService.category.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when category has associated products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Galletas',
      });
      mockPrismaService.product.count.mockResolvedValue(3);

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(mockPrismaService.category.delete).not.toHaveBeenCalled();
    });

    it('should delete the category when it has no associated products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Galletas',
      });
      mockPrismaService.product.count.mockResolvedValue(0);
      const deleted = { id: 'cat-1', name: 'Galletas' };
      mockPrismaService.category.delete.mockResolvedValue(deleted);

      const result = await service.remove('cat-1');

      expect(result).toEqual(deleted);
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
      });
      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });
});
