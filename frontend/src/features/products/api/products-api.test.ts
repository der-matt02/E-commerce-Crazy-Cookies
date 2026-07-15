import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productsApi, categoriesApi } from './products-api';
import { apiClient } from '@/lib/api-client';
import type {
  Category,
  CreateCategoryDto,
  CreateProductDto,
  Product,
  UpdateCategoryDto,
  UpdateProductDto,
} from '@/types/product.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Chocolate Chip Cookie',
    slug: 'chocolate-chip-cookie',
    description: 'Delicious',
    price: 5.5,
    isActive: true,
    categoryId: 'cat-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Cookies',
    slug: 'cookies',
    description: null,
    imageUrl: null,
    isActive: true,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('productsApi.getAll', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the array as-is when the API responds with a plain array (filtered by categoryId)', async () => {
    const products = [buildProduct({ id: 'p1' }), buildProduct({ id: 'p2' })];
    mockedApiClient.get.mockResolvedValue({ data: products });

    const result = await productsApi.getAll('cat-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/products', {
      params: { categoryId: 'cat-1' },
    });
    expect(result).toBe(products);
    expect(Array.isArray(result)).toBe(true);
  });

  it('unwraps { products } when the API responds with a paginated object (no categoryId)', async () => {
    const products = [buildProduct({ id: 'p1' }), buildProduct({ id: 'p2' })];
    mockedApiClient.get.mockResolvedValue({ data: { products } });

    const result = await productsApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/products', { params: {} });
    expect(result).toBe(products);
  });

  it('unwraps to an empty array when { products: [] } is returned', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { products: [] } });

    const result = await productsApi.getAll();

    expect(result).toEqual([]);
  });

  it('returns an empty array as-is when the API responds with an empty plain array', async () => {
    mockedApiClient.get.mockResolvedValue({ data: [] });

    const result = await productsApi.getAll('cat-1');

    expect(result).toEqual([]);
  });
});

describe('productsApi other methods', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getOne() fetches /products/:id and returns the product', async () => {
    const product = buildProduct();
    mockedApiClient.get.mockResolvedValue({ data: product });

    const result = await productsApi.getOne('product-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/products/product-1');
    expect(result).toBe(product);
  });

  it('search() calls /products/search with all given params and returns the result', async () => {
    const searchResult = {
      products: [buildProduct()],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false },
    };
    mockedApiClient.get.mockResolvedValue({ data: searchResult });
    const params = {
      q: 'chocolate',
      categoryId: 'cat-1',
      minPrice: 1,
      maxPrice: 10,
      inStock: true,
      sortBy: 'price_asc' as const,
      page: 1,
      limit: 10,
    };

    const result = await productsApi.search(params);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/products/search', { params });
    expect(result).toBe(searchResult);
  });

  it('create() posts to /products with the dto and returns the created product', async () => {
    const product = buildProduct();
    mockedApiClient.post.mockResolvedValue({ data: product });
    const dto: CreateProductDto = {
      name: 'Chocolate Chip Cookie',
      slug: 'chocolate-chip-cookie',
      description: 'Delicious',
      price: 5.5,
      categoryId: 'cat-1',
    };

    const result = await productsApi.create(dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/products', dto);
    expect(result).toBe(product);
  });

  it('update() patches /products/:id with the dto and returns the updated product', async () => {
    const product = buildProduct({ price: 6.5 });
    mockedApiClient.patch.mockResolvedValue({ data: product });
    const dto: UpdateProductDto = { price: 6.5 };

    const result = await productsApi.update('product-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/products/product-1', dto);
    expect(result).toBe(product);
  });

  it('delete() calls DELETE /products/:id and returns nothing', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: undefined });

    const result = await productsApi.delete('product-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/products/product-1');
    expect(result).toBeUndefined();
  });

  it('uploadImage() posts FormData with multipart header to /products/:id/images', async () => {
    const image = {
      id: 'img-1',
      url: 'http://example.com/img.png',
      alt: null,
      order: 0,
      productId: 'product-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    mockedApiClient.post.mockResolvedValue({ data: image });
    const file = new File(['content'], 'cookie.png', { type: 'image/png' });

    const result = await productsApi.uploadImage('product-1', file);

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = mockedApiClient.post.mock.calls[0];
    expect(url).toBe('/products/product-1/images');
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('image')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    expect(result).toBe(image);
  });

  it('deleteImage() calls DELETE /products/:productId/images/:imageId', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: undefined });

    await productsApi.deleteImage('product-1', 'img-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/products/product-1/images/img-1');
  });
});

describe('categoriesApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAll() fetches /categories and returns the list', async () => {
    const categories = [buildCategory()];
    mockedApiClient.get.mockResolvedValue({ data: categories });

    const result = await categoriesApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/categories');
    expect(result).toBe(categories);
  });

  it('getOne() fetches /categories/:id and returns the category', async () => {
    const category = buildCategory();
    mockedApiClient.get.mockResolvedValue({ data: category });

    const result = await categoriesApi.getOne('cat-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/categories/cat-1');
    expect(result).toBe(category);
  });

  it('create() posts to /categories with the dto and returns the created category', async () => {
    const category = buildCategory();
    mockedApiClient.post.mockResolvedValue({ data: category });
    const dto: CreateCategoryDto = { name: 'Cookies', slug: 'cookies' };

    const result = await categoriesApi.create(dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/categories', dto);
    expect(result).toBe(category);
  });

  it('update() patches /categories/:id with the dto and returns the updated category', async () => {
    const category = buildCategory({ name: 'Cookies & Cream' });
    mockedApiClient.patch.mockResolvedValue({ data: category });
    const dto: UpdateCategoryDto = { name: 'Cookies & Cream' };

    const result = await categoriesApi.update('cat-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/categories/cat-1', dto);
    expect(result).toBe(category);
  });

  it('delete() calls DELETE /categories/:id', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: undefined });

    await categoriesApi.delete('cat-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/categories/cat-1');
  });
});
