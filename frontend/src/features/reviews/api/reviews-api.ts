import { apiClient } from '@/lib/api-client';
import type { Review, CreateReviewDto, ApproveReviewDto, RatingStats } from '@/types/review.types';

export const reviewsApi = {
  async createForProduct(productId: string, dto: CreateReviewDto): Promise<Review> {
    const { data } = await apiClient.post<Review>(`/reviews/products/${productId}`, dto);
    return data;
  },

  async getByProduct(productId: string, includeUnapproved = false): Promise<Review[]> {
    const params = includeUnapproved ? { includeUnapproved: 'true' } : {};
    const { data } = await apiClient.get<Review[]>(`/reviews/products/${productId}`, { params });
    return data;
  },

  async getProductRatingStats(productId: string): Promise<RatingStats> {
    const { data } = await apiClient.get<RatingStats>(`/reviews/products/${productId}/stats`);
    return data;
  },

  async getPending(): Promise<Review[]> {
    const { data } = await apiClient.get<Review[]>('/reviews/pending');
    return data;
  },

  async getAll(approved?: boolean): Promise<Review[]> {
    const params = approved !== undefined ? { approved: approved ? 'true' : 'false' } : {};
    const { data } = await apiClient.get<Review[]>('/reviews', { params });
    return data;
  },

  async approve(id: string, dto: ApproveReviewDto): Promise<Review> {
    const { data } = await apiClient.patch<Review>(`/reviews/${id}/approve`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },
};
