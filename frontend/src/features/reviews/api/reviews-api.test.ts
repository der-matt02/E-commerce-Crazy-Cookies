import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewsApi } from './reviews-api';
import { apiClient } from '@/lib/api-client';
import type { CreateReviewDto, ApproveReviewDto } from '@/types/review.types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

describe('reviewsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('createForProduct() posts to /reviews/products/:productId with the dto', async () => {
    const review = { id: 'review-1', rating: 5 } as never;
    mockedApiClient.post.mockResolvedValue({ data: review });
    const dto: CreateReviewDto = {
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      rating: 5,
      comment: 'Great!',
    };

    const result = await reviewsApi.createForProduct('product-1', dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/reviews/products/product-1', dto);
    expect(result).toBe(review);
  });

  it('getByProduct() fetches approved reviews only by default (no params)', async () => {
    const reviews = [{ id: 'review-1' }] as never;
    mockedApiClient.get.mockResolvedValue({ data: reviews });

    const result = await reviewsApi.getByProduct('product-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews/products/product-1', { params: {} });
    expect(result).toBe(reviews);
  });

  it('getByProduct() includes unapproved reviews when includeUnapproved=true', async () => {
    const reviews = [{ id: 'review-1' }, { id: 'review-2' }] as never;
    mockedApiClient.get.mockResolvedValue({ data: reviews });

    const result = await reviewsApi.getByProduct('product-1', true);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews/products/product-1', {
      params: { includeUnapproved: 'true' },
    });
    expect(result).toBe(reviews);
  });

  it('getProductRatingStats() fetches /reviews/products/:productId/stats', async () => {
    const stats = { average: 4.5, count: 10, distribution: {} } as never;
    mockedApiClient.get.mockResolvedValue({ data: stats });

    const result = await reviewsApi.getProductRatingStats('product-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews/products/product-1/stats');
    expect(result).toBe(stats);
  });

  it('getPending() fetches /reviews/pending', async () => {
    const reviews = [{ id: 'review-1', isApproved: false }] as never;
    mockedApiClient.get.mockResolvedValue({ data: reviews });

    const result = await reviewsApi.getPending();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews/pending');
    expect(result).toBe(reviews);
  });

  it('getAll() fetches /reviews with no params when approved is not specified', async () => {
    const reviews = [{ id: 'review-1' }] as never;
    mockedApiClient.get.mockResolvedValue({ data: reviews });

    const result = await reviewsApi.getAll();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews', { params: {} });
    expect(result).toBe(reviews);
  });

  it('getAll(true) fetches /reviews with approved=true', async () => {
    mockedApiClient.get.mockResolvedValue({ data: [] });

    await reviewsApi.getAll(true);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews', { params: { approved: 'true' } });
  });

  it('getAll(false) fetches /reviews with approved=false', async () => {
    mockedApiClient.get.mockResolvedValue({ data: [] });

    await reviewsApi.getAll(false);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/reviews', { params: { approved: 'false' } });
  });

  it('approve() patches /reviews/:id/approve with the dto', async () => {
    const review = { id: 'review-1', isApproved: true } as never;
    mockedApiClient.patch.mockResolvedValue({ data: review });
    const dto: ApproveReviewDto = { isApproved: true };

    const result = await reviewsApi.approve('review-1', dto);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/reviews/review-1/approve', dto);
    expect(result).toBe(review);
  });

  it('delete() deletes /reviews/:id and returns nothing', async () => {
    mockedApiClient.delete.mockResolvedValue({ data: undefined });

    const result = await reviewsApi.delete('review-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/reviews/review-1');
    expect(result).toBeUndefined();
  });
});
