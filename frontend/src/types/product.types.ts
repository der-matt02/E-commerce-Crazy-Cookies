export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  inventory?: Inventory;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    reviews: number;
    orderItems: number;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  order: number;
  productId: string;
  createdAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  stockAvailable: number;
  stockReserved: number;
  stockMinimum: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CreateProductDto {
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  isActive?: boolean;
  stockAvailable?: number;
  stockMinimum?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}
