import { serverFetch } from '@/lib/server-api';
import { ProductsCatalog } from '@/features/products/components/ProductsCatalog';
import type { Product, Category } from '@/types/product.types';
import type { SearchResult } from '@/features/products/api/products-api';

export default async function ProductsPage() {
  const [initialData, categories] = await Promise.all([
    serverFetch<SearchResult>('/products/search?page=1&limit=12&sortBy=newest', {
      revalidate: 60,
    }).catch(() => ({
      products: [] as Product[],
      pagination: { total: 0, page: 1, limit: 12, totalPages: 1, hasNext: false, hasPrev: false },
    })),
    serverFetch<Category[]>('/categories', { revalidate: 300 }).catch(() => [] as Category[]),
  ]);

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <ProductsCatalog
      initialProducts={initialData.products}
      initialCategories={activeCategories}
      initialPagination={initialData.pagination}
    />
  );
}
