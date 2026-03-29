import { apiClient } from '@/lib/api-client';
import type {
  Product,
  ProductImage,
  CreateProductDto,
  UpdateProductDto,
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/types/product.types';

export interface SearchResult {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const productsApi = {
  async getAll(categoryId?: string): Promise<Product[]> {
    const params = categoryId ? { categoryId } : {};
    const { data } = await apiClient.get<Product[]>('/products', { params });
    return data;
  },

  async getOne(id: string): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
  },

  async search(params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
    page?: number;
    limit?: number;
  }): Promise<SearchResult> {
    const { data } = await apiClient.get<SearchResult>('/products/search', { params });
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

  async uploadImage(productId: string, file: File): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await apiClient.post<ProductImage>(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteImage(productId: string, imageId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/images/${imageId}`);
  },
};

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const { data } = await apiClient.get<Category[]>('/categories');
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
