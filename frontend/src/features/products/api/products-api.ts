import { apiClient } from '@/lib/api-client';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/types/product.types';

export const productsApi = {
  // Products
  async getAll(categoryId?: string): Promise<Product[]> {
    const params = categoryId ? { categoryId } : {};
    const { data } = await apiClient.get<Product[]>('/products', { params });
    return data;
  },

  async getOne(id: string): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
  },

  async create(dto: CreateProductDto): Promise<Product> {
    const { data } = await apiClient.post<Product>('/products', dto);
    return data;
  },

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const { data } = await apiClient.patch<Product>(`/products/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },
};

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const { data} = await apiClient.get<Category[]>('/categories');
    return data;
  },

  async getOne(id: string): Promise<Category> {
    const { data } = await apiClient.get<Category>(`/categories/${id}`);
    return data;
  },

  async create(dto: CreateCategoryDto): Promise<Category> {
    const { data } = await apiClient.post<Category>('/categories', dto);
    return data;
  },

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const { data } = await apiClient.patch<Category>(`/categories/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
