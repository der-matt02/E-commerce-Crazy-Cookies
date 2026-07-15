import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        // JwtAuthGuard is referenced via @UseGuards() on protected routes; Nest
        // registers it as an implicit injectable of this module, so its own
        // dependency (ConfigService) must be resolvable even though the guard
        // never actually executes in these unit tests.
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service.create and return its result', async () => {
      const dto: CreateCategoryDto = { name: 'Galletas', slug: 'galletas' };
      const created = { id: 'cat-1', ...dto };
      mockCategoriesService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(result).toEqual(created);
      expect(mockCategoriesService.create).toHaveBeenCalledWith(dto);
    });

    it('should propagate ConflictException thrown by the service', async () => {
      const dto: CreateCategoryDto = { name: 'Galletas', slug: 'galletas' };
      mockCategoriesService.create.mockRejectedValue(
        new ConflictException('Category with slug "galletas" already exists'),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should delegate to service.findAll and return its result', async () => {
      const categories = [{ id: 'cat-1', name: 'Galletas' }];
      mockCategoriesService.findAll.mockResolvedValue(categories);

      const result = await controller.findAll();

      expect(result).toEqual(categories);
      expect(mockCategoriesService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne with the given id', async () => {
      const category = { id: 'cat-1', name: 'Galletas' };
      mockCategoriesService.findOne.mockResolvedValue(category);

      const result = await controller.findOne('cat-1');

      expect(result).toEqual(category);
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith('cat-1');
    });

    it('should propagate NotFoundException thrown by the service', async () => {
      mockCategoriesService.findOne.mockRejectedValue(
        new NotFoundException('Category with ID "missing" not found'),
      );

      await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should delegate to service.update with id and dto', async () => {
      const dto: UpdateCategoryDto = { name: 'Postres' };
      const updated = { id: 'cat-1', name: 'Postres' };
      mockCategoriesService.update.mockResolvedValue(updated);

      const result = await controller.update('cat-1', dto);

      expect(result).toEqual(updated);
      expect(mockCategoriesService.update).toHaveBeenCalledWith('cat-1', dto);
    });

    it('should propagate NotFoundException thrown by the service', async () => {
      mockCategoriesService.update.mockRejectedValue(
        new NotFoundException('Category with ID "missing" not found'),
      );

      await expect(controller.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException thrown by the service', async () => {
      mockCategoriesService.update.mockRejectedValue(
        new ConflictException('Category with slug "dup" already exists'),
      );

      await expect(controller.update('cat-1', { slug: 'dup' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove with the given id', async () => {
      const deleted = { id: 'cat-1', name: 'Galletas' };
      mockCategoriesService.remove.mockResolvedValue(deleted);

      const result = await controller.remove('cat-1');

      expect(result).toEqual(deleted);
      expect(mockCategoriesService.remove).toHaveBeenCalledWith('cat-1');
    });

    it('should propagate NotFoundException thrown by the service', async () => {
      mockCategoriesService.remove.mockRejectedValue(
        new NotFoundException('Category with ID "missing" not found'),
      );

      await expect(controller.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException when category has associated products', async () => {
      mockCategoriesService.remove.mockRejectedValue(
        new ConflictException('Cannot delete category with 2 product(s)'),
      );

      await expect(controller.remove('cat-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('route guards', () => {
    const getGuards = (methodName: keyof CategoriesController) =>
      // eslint-disable-next-line security/detect-object-injection -- methodName is typed as keyof CategoriesController, not attacker input
      Reflect.getMetadata(GUARDS_METADATA, controller[methodName]) ?? [];

    it('should protect create with JwtAuthGuard', () => {
      expect(getGuards('create')).toContain(JwtAuthGuard);
    });

    it('should protect update with JwtAuthGuard', () => {
      expect(getGuards('update')).toContain(JwtAuthGuard);
    });

    it('should protect remove with JwtAuthGuard', () => {
      expect(getGuards('remove')).toContain(JwtAuthGuard);
    });

    it('should NOT protect findAll with any guard', () => {
      expect(getGuards('findAll')).toEqual([]);
    });

    it('should NOT protect findOne with any guard', () => {
      expect(getGuards('findOne')).toEqual([]);
    });
  });
});
