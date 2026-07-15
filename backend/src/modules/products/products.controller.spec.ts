import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '@modules/admin/guards/jwt-auth.guard';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByCategory: jest.fn(),
    search: jest.fn(),
    getFeatured: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addImage: jest.fn(),
    removeImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service.create with the DTO', async () => {
      const dto = {
        name: 'Galletas',
        slug: 'galletas',
        description: 'Descripcion larga suficiente',
        price: 1000,
        categoryId: 'cat-1',
      };
      const created = { id: 'product-1', ...dto };
      mockProductsService.create.mockResolvedValue(created);

      const result = await controller.create(dto as CreateProductDto);

      expect(result).toEqual(created);
      expect(mockProductsService.create).toHaveBeenCalledWith(dto);
    });

    it('should be guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.create);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with page/limit when no categoryId is given', async () => {
      const paginated = { products: [], pagination: { total: 0, page: 1, limit: 50 } };
      mockProductsService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(undefined, 1, 50);

      expect(result).toEqual(paginated);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(1, 50);
      expect(mockProductsService.findByCategory).not.toHaveBeenCalled();
    });

    it('should delegate to service.findByCategory (flat array) when categoryId is given', async () => {
      const flatArray = [{ id: 'p1' }, { id: 'p2' }];
      mockProductsService.findByCategory.mockResolvedValue(flatArray);

      const result = await controller.findAll('cat-1', 1, 50);

      expect(result).toEqual(flatArray);
      expect(Array.isArray(result)).toBe(true);
      expect(mockProductsService.findByCategory).toHaveBeenCalledWith('cat-1');
      expect(mockProductsService.findAll).not.toHaveBeenCalled();
    });

    it('should propagate custom page and limit values', async () => {
      mockProductsService.findAll.mockResolvedValue({ products: [], pagination: {} });

      await controller.findAll(undefined, 3, 20);

      expect(mockProductsService.findAll).toHaveBeenCalledWith(3, 20);
    });
  });

  describe('search', () => {
    it('should parse and forward all query params to service.search', async () => {
      mockProductsService.search.mockResolvedValue({ products: [], pagination: {} });

      await controller.search('chocolate', 'cat-1', '1000', '5000', 'true', 'price_asc', '2', '10');

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'chocolate',
        categoryId: 'cat-1',
        minPrice: 1000,
        maxPrice: 5000,
        inStock: true,
        sortBy: 'price_asc',
        page: 2,
        limit: 10,
      });
    });

    it('should pass undefined for optional numeric params when not provided', async () => {
      mockProductsService.search.mockResolvedValue({ products: [], pagination: {} });

      await controller.search();

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: undefined,
        categoryId: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        inStock: false,
        sortBy: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should set inStock to false when the query param is not the string "true"', async () => {
      mockProductsService.search.mockResolvedValue({ products: [], pagination: {} });

      await controller.search(undefined, undefined, undefined, undefined, 'false');

      expect(mockProductsService.search).toHaveBeenCalledWith(
        expect.objectContaining({ inStock: false }),
      );
    });
  });

  describe('getFeatured', () => {
    it('should delegate to service.getFeatured parsing limit', async () => {
      const products = [{ id: 'p1' }];
      mockProductsService.getFeatured.mockResolvedValue(products);

      const result = await controller.getFeatured('5');

      expect(result).toEqual(products);
      expect(mockProductsService.getFeatured).toHaveBeenCalledWith(5);
    });

    it('should pass undefined limit when not provided', async () => {
      mockProductsService.getFeatured.mockResolvedValue([]);

      await controller.getFeatured();

      expect(mockProductsService.getFeatured).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      const product = { id: 'product-1' };
      mockProductsService.findOne.mockResolvedValue(product);

      const result = await controller.findOne('product-1');

      expect(result).toEqual(product);
      expect(mockProductsService.findOne).toHaveBeenCalledWith('product-1');
    });
  });

  describe('update', () => {
    it('should delegate to service.update with id and DTO', async () => {
      const dto = { name: 'Nuevo nombre' };
      const updated = { id: 'product-1', ...dto };
      mockProductsService.update.mockResolvedValue(updated);

      const result = await controller.update('product-1', dto as UpdateProductDto);

      expect(result).toEqual(updated);
      expect(mockProductsService.update).toHaveBeenCalledWith('product-1', dto);
    });

    it('should be guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.update);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove('product-1');

      expect(mockProductsService.remove).toHaveBeenCalledWith('product-1');
    });

    it('should be guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.remove);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });

  describe('addImage', () => {
    it('should throw BadRequestException when no file is provided', () => {
      expect(() =>
        controller.addImage('product-1', undefined as unknown as Express.Multer.File),
      ).toThrow(BadRequestException);
      expect(mockProductsService.addImage).not.toHaveBeenCalled();
    });

    it('should delegate to service.addImage when a file is provided', async () => {
      const file = { filename: 'abc.jpg', originalname: 'cookie.jpg' } as Express.Multer.File;
      const image = { id: 'image-1', url: '/uploads/products/abc.jpg' };
      mockProductsService.addImage.mockResolvedValue(image);

      const result = await controller.addImage('product-1', file);

      expect(result).toEqual(image);
      expect(mockProductsService.addImage).toHaveBeenCalledWith('product-1', file);
    });

    it('should be guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.addImage);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });

  describe('removeImage', () => {
    it('should delegate to service.removeImage with productId and imageId', async () => {
      mockProductsService.removeImage.mockResolvedValue(undefined);

      await controller.removeImage('product-1', 'image-1');

      expect(mockProductsService.removeImage).toHaveBeenCalledWith('product-1', 'image-1');
    });

    it('should be guarded by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', controller.removeImage);
      expect(guards).toBeDefined();
      expect(guards[0]).toBe(JwtAuthGuard);
    });
  });
});
